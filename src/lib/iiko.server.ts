import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ACCESS_TOKEN_PATH = "/api/1/access_token"
const CREATE_WRITEOFF_PATH = "/api/inventory/v1/writeoff_document/create"
const POST_WRITEOFF_PATH = "/api/inventory/v1/writeoff_document/post"

interface IikoEnv {
  IIKO_API_LOGIN?: string
  IIKO_API_BASE_URL?: string
  IIKO_ORGANIZATION_ID?: string
  IIKO_EXPENSE_ACCOUNT_ID?: string
  IIKO_STORAGE_MAP?: string
  IIKO_PRODUCT_MAP?: string
  IIKO_TIMEOUT_MS?: string
}

interface IikoConfig {
  apiLogin: string
  baseUrl: URL
  organizationId: string
  expenseAccountId: string
  storageMap: Record<string, string>
  productMap: Record<string, string>
  timeoutMs: number
}

export interface IikoWriteOffActInput {
  requestId: string
  requestNumber: string
  storeId: string
  storeName: string
  productId: string
  productName: string
  productSku: string
  quantity: number
  unit: string
  comment: string
  reviewedAt: Date | null
}

export interface IikoWriteOffAct {
  organizationId: string
  storeFrom: string
  expenseAccount: string
  date: string
  comment: string
  items: Array<{
    num: number
    product: string
    amount: number
  }>
}

export interface IikoSyncResult {
  documentId: string
  documentNumber?: string
  message?: string
  payload: IikoWriteOffAct
}

interface TokenResponse {
  token?: string
  correlationId?: string
}

interface SaveDocumentResponse {
  documentId?: string
  documentNumber?: string
  message?: string
}

interface HttpResponse<T> {
  status: number
  body: T
  retryAfter: string | null
}

export class IikoApiError extends Error {
  createdDocumentId?: string

  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string,
    public readonly details?: unknown,
    public readonly retryAfterSeconds?: number
  ) {
    super(message)
    this.name = "IikoApiError"
  }
}

let serviceInstance: IikoWriteoffService | undefined

export function getIikoWriteOffPreview(input: IikoWriteOffActInput) {
  try {
    return buildIikoWriteOffAct(input, getIikoConfig())
  } catch {
    return null
  }
}

export async function createIikoWriteOffDocument(
  input: IikoWriteOffActInput,
  existingDocumentId?: string | null
): Promise<IikoSyncResult> {
  const config = getIikoConfig()
  const payload = buildIikoWriteOffAct(input, config)
  serviceInstance ??= new IikoWriteoffService(config)
  return serviceInstance.writeOff(payload, existingDocumentId)
}

function buildIikoWriteOffAct(
  input: IikoWriteOffActInput,
  config: IikoConfig
): IikoWriteOffAct {
  const storageId = config.storageMap[input.storeId]
  const productId = config.productMap[input.productId]

  if (!storageId) {
    throw new Error(`IIKO_STORAGE_MAP has no entry for ${input.storeId}`)
  }
  if (!productId) {
    throw new Error(`IIKO_PRODUCT_MAP has no entry for ${input.productId}`)
  }

  validateGuid("storageId", storageId)
  validateGuid("productId", productId)
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("iiko write-off quantity must be greater than zero")
  }

  return {
    organizationId: config.organizationId,
    storeFrom: storageId,
    expenseAccount: config.expenseAccountId,
    date: (input.reviewedAt ?? new Date()).toISOString(),
    comment: `${input.requestNumber} · ${input.storeName} · ${input.productName} ${input.quantity} ${input.unit} · ${input.comment}`,
    items: [{ num: 1, product: productId, amount: input.quantity }],
  }
}

class IikoWriteoffService {
  private token?: { value: string; expiresAt: number }
  private tokenRequest?: Promise<string>

  constructor(private readonly config: IikoConfig) {}

  async writeOff(
    payload: IikoWriteOffAct,
    existingDocumentId?: string | null
  ): Promise<IikoSyncResult> {
    let documentId = existingDocumentId ?? undefined
    let created: SaveDocumentResponse = {}

    try {
      if (documentId) {
        validateGuid("existingDocumentId", documentId)
      } else {
        created = await this.authorizedPost<SaveDocumentResponse>(
          CREATE_WRITEOFF_PATH,
          payload,
          201
        )
        if (!created.documentId || !GUID_PATTERN.test(created.documentId)) {
          throw new IikoApiError(
            "iiko returned no valid documentId after creating the write-off",
            502,
            CREATE_WRITEOFF_PATH,
            created
          )
        }
        documentId = created.documentId
      }

      const posted = await this.authorizedPost<SaveDocumentResponse>(
        POST_WRITEOFF_PATH,
        {
          departmentId: payload.organizationId,
          documentId,
        },
        200
      )

      return {
        documentId: posted.documentId || documentId,
        documentNumber: posted.documentNumber || created.documentNumber,
        message: posted.message || created.message,
        payload,
      }
    } catch (error) {
      const apiError = normalizeError(error)
      apiError.createdDocumentId = documentId
      console.error("iiko write-off failed", {
        organizationId: payload.organizationId,
        storageId: payload.storeFrom,
        createdDocumentId: documentId,
        status: apiError.status,
        endpoint: apiError.endpoint,
        retryAfterSeconds: apiError.retryAfterSeconds,
        message: apiError.message,
      })
      throw apiError
    }
  }

  private async getToken(forceRefresh = false) {
    const now = Date.now()
    if (!forceRefresh && this.token && now < this.token.expiresAt) {
      return this.token.value
    }
    if (!forceRefresh && this.tokenRequest) {
      return this.tokenRequest
    }

    this.tokenRequest = this.fetchToken()
    try {
      return await this.tokenRequest
    } finally {
      this.tokenRequest = undefined
    }
  }

  private async fetchToken() {
    const response = await this.post<TokenResponse>(ACCESS_TOKEN_PATH, {
      apiLogin: this.config.apiLogin,
    })
    if (response.status !== 200 || !response.body.token) {
      throw toApiError(ACCESS_TOKEN_PATH, response)
    }

    this.token = {
      value: response.body.token,
      expiresAt: Date.now() + 14.5 * 60_000,
    }
    return response.body.token
  }

  private async authorizedPost<T>(
    endpoint: string,
    body: unknown,
    expectedStatus: number
  ) {
    let token = await this.getToken()
    let response = await this.post<T>(endpoint, body, token)

    if (response.status === 401) {
      this.token = undefined
      token = await this.getToken(true)
      response = await this.post<T>(endpoint, body, token)
    }
    if (response.status !== expectedStatus) {
      throw toApiError(endpoint, response)
    }
    return response.body
  }

  private async post<T>(
    endpoint: string,
    body: unknown,
    token?: string
  ): Promise<HttpResponse<T>> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs)

    try {
      const response = await fetch(new URL(endpoint, this.config.baseUrl), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      const text = await response.text()
      let parsed: unknown = {}
      try {
        parsed = text ? JSON.parse(text) : {}
      } catch {
        parsed = { message: text || "iiko returned a non-JSON response" }
      }
      return {
        status: response.status,
        body: parsed as T,
        retryAfter: response.headers.get("retry-after"),
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new IikoApiError(
          `iiko request timed out after ${this.config.timeoutMs}ms`,
          0,
          endpoint
        )
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
}

function getIikoConfig(): IikoConfig {
  const values = env as unknown as IikoEnv
  const apiLogin = values.IIKO_API_LOGIN?.trim()
  const organizationId = values.IIKO_ORGANIZATION_ID?.trim()
  const expenseAccountId = values.IIKO_EXPENSE_ACCOUNT_ID?.trim()

  if (!apiLogin) throw new Error("IIKO_API_LOGIN is not configured")
  if (!organizationId) throw new Error("IIKO_ORGANIZATION_ID is not configured")
  if (!expenseAccountId) {
    throw new Error("IIKO_EXPENSE_ACCOUNT_ID is not configured")
  }
  validateGuid("IIKO_ORGANIZATION_ID", organizationId)
  validateGuid("IIKO_EXPENSE_ACCOUNT_ID", expenseAccountId)

  const baseUrl = new URL(
    values.IIKO_API_BASE_URL || "https://api-ru.iiko.services"
  )
  if (baseUrl.protocol !== "https:") {
    throw new Error("IIKO_API_BASE_URL must use HTTPS")
  }

  return {
    apiLogin,
    baseUrl,
    organizationId,
    expenseAccountId,
    storageMap: parseMap(values.IIKO_STORAGE_MAP, "IIKO_STORAGE_MAP"),
    productMap: parseMap(values.IIKO_PRODUCT_MAP, "IIKO_PRODUCT_MAP"),
    timeoutMs: parseTimeout(values.IIKO_TIMEOUT_MS),
  }
}

function parseMap(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is not configured`)
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("must be a JSON object")
    }
    return parsed as Record<string, string>
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid JSON"
    throw new Error(`${name} ${message}`)
  }
}

function parseTimeout(value: string | undefined) {
  const timeout = value ? Number(value) : 15_000
  if (!Number.isFinite(timeout) || timeout < 1_000 || timeout > 60_000) {
    throw new Error("IIKO_TIMEOUT_MS must be between 1000 and 60000")
  }
  return timeout
}

function validateGuid(field: string, value: string) {
  if (!GUID_PATTERN.test(value)) {
    throw new Error(`${field} must be a valid GUID`)
  }
}

function toApiError(endpoint: string, response: HttpResponse<unknown>) {
  const body = (response.body || {}) as {
    message?: string
    details?: unknown
  }
  const retryAfter = response.retryAfter
    ? Number(response.retryAfter)
    : undefined
  const fallback: Record<number, string> = {
    400: "iiko rejected the request payload",
    401: "iiko authentication failed",
    403: "iiko denied access to this inventory operation",
    429: "iiko rate limit exceeded",
  }

  return new IikoApiError(
    body.message ||
      fallback[response.status] ||
      `iiko request failed with HTTP ${response.status}`,
    response.status,
    endpoint,
    body.details || response.body,
    Number.isFinite(retryAfter) ? retryAfter : undefined
  )
}

function normalizeError(error: unknown) {
  if (error instanceof IikoApiError) return error
  return new IikoApiError(
    error instanceof Error ? error.message : "Unknown iiko integration error",
    0,
    "configuration-or-network"
  )
}
