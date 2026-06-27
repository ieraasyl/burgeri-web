import "@tanstack/react-start/server-only"

import { getLocationName } from "@/lib/write-offs"
import type { WriteOffProductType } from "@/lib/write-offs"

// Mapping from our internal product types to the iiko nomenclature. In a real
// integration these ids come from the restaurant's iiko menu; they are mocked
// here so the act payload looks production-shaped until credentials are wired.
const iikoProductCatalog: Record<
  WriteOffProductType,
  { nomenclatureId: string; name: string; measureUnit: string }
> = {
  tomatoes: {
    nomenclatureId: "11111111-0000-0000-0000-000000000001",
    name: "Tomato",
    measureUnit: "pc",
  },
  patty: {
    nomenclatureId: "11111111-0000-0000-0000-000000000002",
    name: "Beef patty",
    measureUnit: "pc",
  },
  bun: {
    nomenclatureId: "11111111-0000-0000-0000-000000000003",
    name: "Burger bun",
    measureUnit: "pc",
  },
  fries: {
    nomenclatureId: "11111111-0000-0000-0000-000000000004",
    name: "French fries",
    measureUnit: "portion",
  },
  other: {
    nomenclatureId: "11111111-0000-0000-0000-000000000009",
    name: "Other product",
    measureUnit: "pc",
  },
}

// Fake store ids keyed by our internal location id.
function iikoStoreId(locationId: string) {
  return `store-${locationId}`
}

export interface IikoWriteOffActInput {
  requestId: string
  locationId: string
  productType: WriteOffProductType
  quantity: number
  comment: string
  reviewedAt: Date | null
}

export interface IikoWriteOffAct {
  documentType: "WriteoffDocument"
  externalId: string
  dateIncoming: string
  store: { id: string; name: string }
  comment: string
  items: Array<{
    productId: string
    productName: string
    amount: number
    measureUnit: string
  }>
  status: "NEW"
}

// Build the document payload that would be POSTed to the iiko Server API. Pure
// and side-effect free so the reviewer can preview it before syncing.
export function buildIikoWriteOffAct(
  input: IikoWriteOffActInput
): IikoWriteOffAct {
  const product = iikoProductCatalog[input.productType]
  const incoming = input.reviewedAt ?? new Date()

  return {
    documentType: "WriteoffDocument",
    externalId: input.requestId,
    dateIncoming: incoming.toISOString(),
    store: {
      id: iikoStoreId(input.locationId),
      name: getLocationName(input.locationId),
    },
    comment: input.comment,
    items: [
      {
        productId: product.nomenclatureId,
        productName: product.name,
        amount: input.quantity,
        measureUnit: product.measureUnit,
      },
    ],
    status: "NEW",
  }
}

export interface IikoSyncResult {
  documentId: string
  payload: IikoWriteOffAct
}

// Stand-in for the real iiko Server API call. A live adapter would authenticate
// with `/resto/api/auth`, POST the act, and return the created document id.
export async function createIikoWriteOffDocument(
  input: IikoWriteOffActInput
): Promise<IikoSyncResult> {
  const payload = buildIikoWriteOffAct(input)
  const documentId = `iiko-${input.requestId.slice(0, 8)}-${Date.now().toString(36)}`

  return { documentId, payload }
}
