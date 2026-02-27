/**
 * Date / time utilities.
 * All dates stored in the DB as UTC ISO 8601.
 * Always display to users in America/Sao_Paulo timezone.
 */

export const TZ_BR = 'America/Sao_Paulo'

/** Format UTC ISO string → "DD/MM/AAAA" (pt-BR) */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TZ_BR,
  }).format(new Date(isoDate))
}

/** Format UTC ISO string → "DD/MM/AAAA HH:MM" (pt-BR) */
export function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ_BR,
  }).format(new Date(isoDate))
}

/** Format UTC ISO string → "HH:MM" */
export function formatTime(isoDate: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ_BR,
  }).format(new Date(isoDate))
}

/** Today's date as YYYY-MM-DD in Sao Paulo timezone */
export function todayBR(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ_BR }).format(new Date())
}
