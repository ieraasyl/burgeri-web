import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listPosByCity, sortCities } from "@/lib/point-of-sale"
import type { PosCatalogEntry } from "@/lib/point-of-sale"

interface CityPosFilterProps {
  pointsOfSale: readonly PosCatalogEntry[]
  city: string
  posId: string
  onCityChange: (city: string) => void
  onPosChange: (posId: string) => void
}

export function CityPosFilter({
  pointsOfSale,
  city,
  posId,
  onCityChange,
  onPosChange,
}: CityPosFilterProps) {
  const cities = sortCities(pointsOfSale.map((pos) => pos.city))
  const posOptions = city === "all" ? [] : listPosByCity(pointsOfSale, city)
  const cityItems = [
    { value: "all", label: "Все города" },
    ...cities.map((value) => ({ value, label: value })),
  ]
  const posAllLabel =
    city === "all" ? "Сначала выберите город" : "Все точки в городе"
  const posItems = [
    { value: "all", label: posAllLabel },
    ...posOptions.map((pos) => ({ value: pos.id, label: pos.name })),
  ]

  return (
    <>
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Город</span>
        <Select
          value={city}
          items={cityItems}
          onValueChange={(value) => {
            onCityChange(value ?? "all")
            onPosChange("all")
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Все города" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Все города</SelectItem>
              {cities.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Точка продаж
        </span>
        <Select
          value={posId}
          items={posItems}
          onValueChange={(value) => onPosChange(value ?? "all")}
          disabled={city === "all"}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Сначала выберите город" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">
                {city === "all"
                  ? "Сначала выберите город"
                  : "Все точки в городе"}
              </SelectItem>
              {posOptions.map((pos) => (
                <SelectItem key={pos.id} value={pos.id}>
                  {pos.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
