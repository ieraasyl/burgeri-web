export interface BurgerMlTopMatch {
  category: string
  confidence: number
  cosine_similarity: number
}

export interface BurgerMlApiResponse {
  category: string
  ingredient_family: string
  confidence: number
  family_confidence: number
  quality_confidence: number
  cosine_similarity: number
  damage_level: string
  tags: string[]
  top3: BurgerMlTopMatch[]
  view_agreement: number
  needs_manual_check: boolean
  suggested_comment: string
}

export interface WriteOffMlClassification {
  classifiedAt: string
  category: string
  ingredientFamily: string
  confidence: number
  damageLevel: string
  needsManualCheck: boolean
  suggestedComment: string
  viewAgreement: number
  productMismatch: boolean
  top3: BurgerMlTopMatch[]
  error?: string
}

/** Maps catalog product ids to burger-ml ingredient families. */
export const productToMlFamily: Record<string, string> = {
  "prod-tomato": "tomato",
  "prod-patty": "patty",
  "prod-bun": "bun",
}

export function isMlSupportedProduct(productId: string) {
  return productId in productToMlFamily
}

export function confidenceColor(confidence: number) {
  const clamped = Math.min(1, Math.max(0, confidence))
  const hue = Math.round(clamped * 120)
  return `hsl(${hue} 72% 42%)`
}

export function formatMlCategory(category: string) {
  return category
    .split("_")
    .map((part) => {
      if (part === "good") return "хорошая"
      if (part === "bad") return "плохая"
      if (part === "fresh") return "свежий"
      if (part === "damaged") return "повреждённый"
      return part
    })
    .join(" ")
}

export function formatMlFamily(family: string) {
  const labels: Record<string, string> = {
    tomato: "помидор",
    patty: "котлета",
    bun: "булочка",
    lettuce: "салат",
    mushroom: "гриб",
    cheese: "сыр",
    pickle: "огурчик",
    onion: "лук",
    unclear_food: "неясно",
  }
  return labels[family] ?? family.replaceAll("_", " ")
}

export function formatDamageLevel(level: string) {
  if (level === "none") return "нет"
  if (level === "high") return "высокий"
  if (level === "unknown") return "неизвестно"
  return level
}
