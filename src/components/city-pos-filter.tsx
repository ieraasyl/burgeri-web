import { listPosByCity, sortCities } from "@/lib/point-of-sale"
import type { PosCatalogEntry } from "@/lib/point-of-sale"

interface CityPosFilterProps {
  pointsOfSale: readonly PosCatalogEntry[]
  city: string
  posId: string
  onCityChange: (city: string) => void
  onPosChange: (posId: string) => void
  selectClass: string
}

export function CityPosFilter({
  pointsOfSale,
  city,
  posId,
  onCityChange,
  onPosChange,
  selectClass,
}: CityPosFilterProps) {
  const cities = sortCities(pointsOfSale.map((pos) => pos.city))
  const posOptions = city === "all" ? [] : listPosByCity(pointsOfSale, city)

  return (
    <>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Город</span>
        <select
          value={city}
          onChange={(event) => {
            onCityChange(event.target.value)
            onPosChange("all")
          }}
          className={selectClass}
        >
          <option value="all">Все города</option>
          {cities.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Точка продаж
        </span>
        <select
          value={posId}
          onChange={(event) => onPosChange(event.target.value)}
          className={selectClass}
          disabled={city === "all"}
        >
          <option value="all">
            {city === "all" ? "Сначала выберите город" : "Все точки в городе"}
          </option>
          {posOptions.map((pos) => (
            <option key={pos.id} value={pos.id}>
              {pos.name}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}
