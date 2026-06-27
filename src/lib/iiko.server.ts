import "@tanstack/react-start/server-only"

// Mock iiko Server API adapter. A live integration would authenticate with
// `/resto/api/auth`, POST the act, and return the created document id; here we
// just build a production-shaped payload and synthesize an id so the reviewer
// can preview and "sync" approved write-offs until credentials are wired.

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
  documentType: "WriteoffDocument"
  externalId: string
  documentNumber: string
  dateIncoming: string
  store: { id: string; name: string }
  comment: string
  items: Array<{
    productId: string
    productArticle: string
    productName: string
    amount: number
    measureUnit: string
  }>
  status: "NEW"
}

export function buildIikoWriteOffAct(
  input: IikoWriteOffActInput
): IikoWriteOffAct {
  const incoming = input.reviewedAt ?? new Date()

  return {
    documentType: "WriteoffDocument",
    externalId: input.requestId,
    documentNumber: input.requestNumber,
    dateIncoming: incoming.toISOString(),
    store: { id: input.storeId, name: input.storeName },
    comment: input.comment,
    items: [
      {
        productId: input.productId,
        productArticle: input.productSku,
        productName: input.productName,
        amount: input.quantity,
        measureUnit: input.unit,
      },
    ],
    status: "NEW",
  }
}

export interface IikoSyncResult {
  documentId: string
  payload: IikoWriteOffAct
}

export async function createIikoWriteOffDocument(
  input: IikoWriteOffActInput
): Promise<IikoSyncResult> {
  const payload = buildIikoWriteOffAct(input)
  const documentId = `iiko-${input.requestId.slice(0, 8)}-${Date.now().toString(36)}`

  return { documentId, payload }
}
