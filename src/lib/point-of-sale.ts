export interface PosCatalogEntry {
  id: string
  name: string
  city: string
}

const preferredCities = ["Алматы", "Астана", "Шымкент"]

export function sortCities(cities: Iterable<string>) {
  const unique = [...new Set([...cities].filter(Boolean))]
  return unique.sort((a, b) => {
    const preferredA = preferredCities.indexOf(a)
    const preferredB = preferredCities.indexOf(b)
    if (preferredA >= 0 || preferredB >= 0) {
      if (preferredA < 0) return 1
      if (preferredB < 0) return -1
      return preferredA - preferredB
    }
    return a.localeCompare(b, "ru")
  })
}

export function listPosByCity(
  pointsOfSale: readonly PosCatalogEntry[],
  city: string
) {
  return pointsOfSale
    .filter((pos) => pos.city === city)
    .sort((a, b) => a.name.localeCompare(b.name, "ru"))
}

export function matchesCityPosFilter(
  row: { pointOfSaleId: string; pointOfSaleCity: string },
  city: string,
  posId: string
) {
  if (city !== "all" && row.pointOfSaleCity !== city) {
    return false
  }
  if (posId !== "all" && row.pointOfSaleId !== posId) {
    return false
  }
  return true
}
