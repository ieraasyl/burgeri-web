export type ActionResult<T = void> =
  | { ok: true; data: T }
  | {
      ok: false
      message: string
      fieldErrors?: Record<string, string[]>
    }

export function actionOk<T = void>(data: T): ActionResult<T> {
  return { ok: true, data }
}

export function actionError(
  message: string,
  fieldErrors?: Record<string, string[]>
): ActionResult<never> {
  return { ok: false, message, fieldErrors }
}
