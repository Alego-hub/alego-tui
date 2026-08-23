export function logError(error: unknown): void {
  if (!process.env.ALEGO_TUI_INK_DEBUG_ERRORS) {
    return
  }

  console.error(error)
}
