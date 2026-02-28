import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, formatTime, todayBR } from '../utils/date'

/**
 * All tests use a fixed UTC timestamp so they're timezone-agnostic:
 *   2024-06-15T15:30:00.000Z
 *   → In America/Sao_Paulo (UTC-3) this is 2024-06-15 12:30
 */
const FIXED_ISO = '2024-06-15T15:30:00.000Z'

describe('formatDate', () => {
  it('returns dd/mm/yyyy in pt-BR', () => {
    expect(formatDate(FIXED_ISO)).toBe('15/06/2024')
  })

  it('handles a date at midnight UTC (still correct day in SP)', () => {
    // 2024-01-01T03:00:00Z = midnight SP
    expect(formatDate('2024-01-01T03:00:00.000Z')).toBe('01/01/2024')
  })

  it('returns a string of form DD/MM/YYYY', () => {
    expect(formatDate(FIXED_ISO)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })
})

describe('formatDateTime', () => {
  it('returns datetime in pt-BR as DD/MM/YYYY HH:mm (SP time)', () => {
    // 2024-06-15T15:30:00Z = 12:30 in SP (-03:00)
    const result = formatDateTime(FIXED_ISO)
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}.*\d{2}:\d{2}$/)
    expect(result).toContain('15/06/2024')
    expect(result).toContain('12:30')
  })

  it('includes both date and time components', () => {
    const result = formatDateTime(FIXED_ISO)
    expect(result.length).toBeGreaterThan(10)
  })
})

describe('formatTime', () => {
  it('returns HH:mm in SP timezone', () => {
    // 15:30 UTC = 12:30 SP
    expect(formatTime(FIXED_ISO)).toBe('12:30')
  })

  it('returns format HH:MM', () => {
    expect(formatTime(FIXED_ISO)).toMatch(/^\d{2}:\d{2}$/)
  })

  it('handles midnight UTC correctly', () => {
    // 2024-03-01T03:00:00Z = 00:00 SP (UTC-3 in DST-off period)
    expect(formatTime('2024-03-01T03:00:00.000Z')).toBe('00:00')
  })
})

describe('todayBR', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    expect(todayBR()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns a plausible current year', () => {
    const year = parseInt(todayBR().split('-')[0], 10)
    expect(year).toBeGreaterThanOrEqual(2024)
    expect(year).toBeLessThanOrEqual(2100)
  })

  it('returns a valid month (01-12)', () => {
    const month = parseInt(todayBR().split('-')[1], 10)
    expect(month).toBeGreaterThanOrEqual(1)
    expect(month).toBeLessThanOrEqual(12)
  })

  it('returns a valid day (01-31)', () => {
    const day = parseInt(todayBR().split('-')[2], 10)
    expect(day).toBeGreaterThanOrEqual(1)
    expect(day).toBeLessThanOrEqual(31)
  })
})
