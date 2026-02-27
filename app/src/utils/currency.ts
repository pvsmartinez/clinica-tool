/**
 * Currency utilities — amounts stored as centavos (integer) in the DB.
 * Always pass/receive centavos to/from the backend; use these only in the UI layer.
 */

/** Format centavos to "R$ 0,00" */
export function formatCurrency(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100)
}

/** Parse "R$ 1.234,56" → 123456 centavos */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.')
  return Math.round(parseFloat(cleaned) * 100)
}

/** Convert centavos to reais (float) — only for display, never for storage */
export function centavosToReais(centavos: number): number {
  return centavos / 100
}
