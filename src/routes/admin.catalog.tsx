import { IconBuildingStore, IconLoader2, IconPlus } from "@tabler/icons-react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { createServerFn, useServerFn } from "@tanstack/react-start"
import { useMemo, useState } from "react"
import type { FormEvent } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  upsertPointOfSale,
  upsertProduct,
  upsertProductCategory,
} from "@/lib/actions"
import { formatMoney } from "@/lib/write-offs"
import type { CatalogAdminData } from "@/lib/write-offs.server"

const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { getCatalogAdminData } = await import("@/lib/write-offs.server")
  return getCatalogAdminData()
})

export const Route = createFileRoute("/admin/catalog")({
  loader: () => getCatalog(),
  component: AdminCatalogPage,
})

type PointOfSale = CatalogAdminData["pointsOfSale"][number]
type Category = CatalogAdminData["categories"][number]
type Product = CatalogAdminData["products"][number]

const unitOptions = [
  { value: "pcs", label: "шт" },
  { value: "portion", label: "порция" },
  { value: "l", label: "л" },
  { value: "kg", label: "кг" },
] as const

function AdminCatalogPage() {
  const initial = Route.useLoaderData()
  const router = useRouter()
  const upsertPosFn = useServerFn(upsertPointOfSale)
  const upsertCategoryFn = useServerFn(upsertProductCategory)
  const upsertProductFn = useServerFn(upsertProduct)

  const [pointsOfSale, setPointsOfSale] = useState(initial.pointsOfSale)
  const [categories, setCategories] = useState(initial.categories)
  const [products, setProducts] = useState(initial.products)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>()
    for (const category of categories) {
      map.set(category.id, [])
    }
    for (const product of products) {
      const list = map.get(product.categoryId) ?? []
      list.push(product)
      map.set(product.categoryId, list)
    }
    return map
  }, [categories, products])

  async function refreshCatalog() {
    const data = await getCatalog()
    setPointsOfSale(data.pointsOfSale)
    setCategories(data.categories)
    setProducts(data.products)
    await router.invalidate()
  }

  async function runCatalogAction(
    key: string,
    action: () => Promise<{ ok: boolean; message?: string }>,
    successMessage: string
  ) {
    setError("")
    setNotice("")
    setPendingKey(key)
    const result = await action()
    setPendingKey(null)
    if (!result.ok) {
      setError(result.message ?? "Не удалось сохранить изменения.")
      return
    }
    setNotice(successMessage)
    await refreshCatalog()
  }

  async function handleCreatePos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await runCatalogAction(
      "pos-create",
      () =>
        upsertPosFn({
          data: {
            name: String(data.get("name")),
            address: String(data.get("address")),
            city: String(data.get("city")),
            isActive: data.get("isActive") === "on",
          },
        }),
      "Точка продаж добавлена."
    )
    event.currentTarget.reset()
  }

  async function handleUpdatePos(
    event: FormEvent<HTMLFormElement>,
    pos: PointOfSale
  ) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await runCatalogAction(
      `pos-${pos.id}`,
      () =>
        upsertPosFn({
          data: {
            id: pos.id,
            name: String(data.get("name")),
            address: String(data.get("address")),
            city: String(data.get("city")),
            isActive: data.get("isActive") === "on",
          },
        }),
      "Точка продаж обновлена."
    )
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await runCatalogAction(
      "category-create",
      () =>
        upsertCategoryFn({
          data: {
            name: String(data.get("name")),
            position: Number(data.get("position")),
          },
        }),
      "Категория продуктов добавлена."
    )
    event.currentTarget.reset()
  }

  async function handleUpdateCategory(
    event: FormEvent<HTMLFormElement>,
    category: Category
  ) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await runCatalogAction(
      `category-${category.id}`,
      () =>
        upsertCategoryFn({
          data: {
            id: category.id,
            name: String(data.get("name")),
            position: Number(data.get("position")),
          },
        }),
      "Категория продуктов обновлена."
    )
  }

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await runCatalogAction(
      "product-create",
      () =>
        upsertProductFn({
          data: {
            categoryId: String(data.get("categoryId")),
            name: String(data.get("name")),
            sku: String(data.get("sku")),
            unit: String(data.get("unit")),
            unitCost: parseUnitCost(data.get("unitCost")),
            isActive: data.get("isActive") === "on",
          },
        }),
      "Продукт добавлен."
    )
    event.currentTarget.reset()
  }

  async function handleUpdateProduct(
    event: FormEvent<HTMLFormElement>,
    product: Product
  ) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await runCatalogAction(
      `product-${product.id}`,
      () =>
        upsertProductFn({
          data: {
            id: product.id,
            categoryId: String(data.get("categoryId")),
            name: String(data.get("name")),
            sku: String(data.get("sku")),
            unit: String(data.get("unit")),
            unitCost: parseUnitCost(data.get("unitCost")),
            isActive: data.get("isActive") === "on",
          },
        }),
      "Продукт обновлён."
    )
  }

  return (
    <>
      <section className="border-b pb-6">
        <h2 className="font-heading text-2xl font-semibold">Справочники</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Управляйте точками продаж и каталогом продуктов, которые видят
          сотрудники в мобильном приложении.
        </p>
      </section>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>Что-то пошло не так</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert className="mt-6">
          <AlertTitle>Готово</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <section className="mt-6 rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <IconBuildingStore className="text-primary" />
          <h3 className="font-heading text-lg font-semibold">Точки продаж</h3>
        </div>

        <details className="mt-4 rounded-xl border p-4">
          <summary className="cursor-pointer font-medium">
            Добавить точку продаж
          </summary>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={handleCreatePos}
          >
            <LabelledInput label="Название" name="name" required />
            <LabelledInput label="Город" name="city" required />
            <LabelledInput label="Адрес" name="address" />
            <ActiveCheckbox name="isActive" defaultChecked label="Активна" />
            <div className="sm:col-span-2">
              <SubmitButton pending={pendingKey === "pos-create"}>
                Добавить
              </SubmitButton>
            </div>
          </form>
        </details>

        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium">Город</th>
                <th className="px-4 py-3 font-medium">Адрес</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Редактирование</th>
              </tr>
            </thead>
            <tbody>
              {pointsOfSale.map((pos) => (
                <tr
                  key={pos.id}
                  className="border-b align-top last:border-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3 font-medium">{pos.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {pos.city || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {pos.address || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge active={pos.isActive} />
                  </td>
                  <td className="px-4 py-3">
                    <details>
                      <summary className="cursor-pointer text-primary">
                        Изменить
                      </summary>
                      <form
                        className="mt-3 grid gap-3"
                        onSubmit={(event) => handleUpdatePos(event, pos)}
                      >
                        <LabelledInput
                          label="Название"
                          name="name"
                          defaultValue={pos.name}
                          required
                        />
                        <LabelledInput
                          label="Город"
                          name="city"
                          defaultValue={pos.city}
                          required
                        />
                        <LabelledInput
                          label="Адрес"
                          name="address"
                          defaultValue={pos.address}
                        />
                        <ActiveCheckbox
                          name="isActive"
                          defaultChecked={pos.isActive}
                          label="Активна"
                        />
                        <SubmitButton pending={pendingKey === `pos-${pos.id}`}>
                          Сохранить
                        </SubmitButton>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <IconPlus className="text-primary" />
          <h3 className="font-heading text-lg font-semibold">
            Каталог продуктов
          </h3>
        </div>

        <details className="mt-4 rounded-xl border p-4">
          <summary className="cursor-pointer font-medium">
            Добавить категорию
          </summary>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={handleCreateCategory}
          >
            <LabelledInput label="Название" name="name" required />
            <LabelledInput
              label="Порядок"
              name="position"
              type="number"
              min={0}
              defaultValue={categories.length + 1}
              required
            />
            <div className="sm:col-span-2">
              <SubmitButton pending={pendingKey === "category-create"}>
                Добавить категорию
              </SubmitButton>
            </div>
          </form>
        </details>

        <details className="mt-4 rounded-xl border p-4">
          <summary className="cursor-pointer font-medium">
            Добавить продукт
          </summary>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={handleCreateProduct}
          >
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Категория
              </span>
              <select
                name="categoryId"
                required
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <option value="">Выберите категорию</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <LabelledInput label="Название" name="name" required />
            <LabelledInput label="Артикул (SKU)" name="sku" />
            <UnitSelect name="unit" defaultValue="pcs" />
            <LabelledInput
              label="Себестоимость (₸)"
              name="unitCost"
              type="number"
              min={0}
              step={1}
              placeholder="Не указана"
            />
            <ActiveCheckbox
              name="isActive"
              defaultChecked
              label="Активен в каталоге"
            />
            <div className="sm:col-span-2">
              <SubmitButton pending={pendingKey === "product-create"}>
                Добавить продукт
              </SubmitButton>
            </div>
          </form>
        </details>

        <div className="mt-6 flex flex-col gap-4">
          {categories.map((category) => {
            const categoryProducts = productsByCategory.get(category.id) ?? []
            return (
              <details key={category.id} className="rounded-xl border p-4" open>
                <summary className="cursor-pointer">
                  <span className="font-medium">{category.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {categoryProducts.length} продуктов · порядок{" "}
                    {category.position}
                  </span>
                </summary>

                <form
                  className="mt-4 grid gap-3 border-b pb-4 sm:grid-cols-2"
                  onSubmit={(event) => handleUpdateCategory(event, category)}
                >
                  <LabelledInput
                    label="Название категории"
                    name="name"
                    defaultValue={category.name}
                    required
                  />
                  <LabelledInput
                    label="Порядок"
                    name="position"
                    type="number"
                    min={0}
                    defaultValue={category.position}
                    required
                  />
                  <div className="sm:col-span-2">
                    <SubmitButton
                      pending={pendingKey === `category-${category.id}`}
                    >
                      Сохранить категорию
                    </SubmitButton>
                  </div>
                </form>

                <div className="mt-4 overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-4 py-3 font-medium">Продукт</th>
                        <th className="px-4 py-3 font-medium">SKU</th>
                        <th className="px-4 py-3 font-medium">Ед.</th>
                        <th className="px-4 py-3 font-medium">Себест.</th>
                        <th className="px-4 py-3 font-medium">Статус</th>
                        <th className="px-4 py-3 font-medium">
                          Редактирование
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryProducts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-6 text-center text-muted-foreground"
                          >
                            В этой категории пока нет продуктов.
                          </td>
                        </tr>
                      ) : (
                        categoryProducts.map((product) => (
                          <tr
                            key={product.id}
                            className="border-b align-top last:border-0 hover:bg-muted/20"
                          >
                            <td className="px-4 py-3 font-medium">
                              {product.name}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {product.sku || "—"}
                            </td>
                            <td className="px-4 py-3">
                              {formatUnit(product.unit)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {formatMoney(product.unitCost)}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge
                                active={product.isActive}
                                activeLabel="Активен"
                                inactiveLabel="Скрыт"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <details>
                                <summary className="cursor-pointer text-primary">
                                  Изменить
                                </summary>
                                <form
                                  className="mt-3 grid gap-3"
                                  onSubmit={(event) =>
                                    handleUpdateProduct(event, product)
                                  }
                                >
                                  <label className="grid gap-1.5">
                                    <span className="text-xs font-medium text-muted-foreground">
                                      Категория
                                    </span>
                                    <select
                                      name="categoryId"
                                      defaultValue={product.categoryId}
                                      className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                                    >
                                      {categories.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <LabelledInput
                                    label="Название"
                                    name="name"
                                    defaultValue={product.name}
                                    required
                                  />
                                  <LabelledInput
                                    label="Артикул (SKU)"
                                    name="sku"
                                    defaultValue={product.sku}
                                  />
                                  <UnitSelect
                                    name="unit"
                                    defaultValue={product.unit}
                                  />
                                  <LabelledInput
                                    label="Себестоимость (₸)"
                                    name="unitCost"
                                    type="number"
                                    min={0}
                                    step={1}
                                    defaultValue={product.unitCost ?? undefined}
                                    placeholder="Не указана"
                                  />
                                  <ActiveCheckbox
                                    name="isActive"
                                    defaultChecked={product.isActive}
                                    label="Активен в каталоге"
                                  />
                                  <SubmitButton
                                    pending={
                                      pendingKey === `product-${product.id}`
                                    }
                                  >
                                    Сохранить
                                  </SubmitButton>
                                </form>
                              </details>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </details>
            )
          })}
        </div>
      </section>
    </>
  )
}

function parseUnitCost(value: FormDataEntryValue | null) {
  if (value == null || value === "") {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function LabelledInput({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input {...props} />
    </label>
  )
}

function UnitSelect({
  name,
  defaultValue,
}: {
  name: string
  defaultValue: string
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        Единица измерения
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        {unitOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ActiveCheckbox({
  name,
  label,
  defaultChecked,
}: {
  name: string
  label: string
  defaultChecked?: boolean
}) {
  return (
    <label className="flex items-center gap-2 pt-6 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 rounded border border-input"
      />
      {label}
    </label>
  )
}

function SubmitButton({
  children,
  pending,
}: {
  children: React.ReactNode
  pending: boolean
}) {
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? (
        <IconLoader2 className="animate-spin" data-icon="inline-start" />
      ) : null}
      {children}
    </Button>
  )
}

function StatusBadge({
  active,
  activeLabel = "Активна",
  inactiveLabel = "Скрыта",
}: {
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
}) {
  return (
    <Badge variant={active ? "success" : "secondary"}>
      {active ? activeLabel : inactiveLabel}
    </Badge>
  )
}

function formatUnit(unit: string) {
  return unitOptions.find((option) => option.value === unit)?.label ?? unit
}
