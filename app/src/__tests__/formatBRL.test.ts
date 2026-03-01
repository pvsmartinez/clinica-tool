import { describe, it, expect } from 'vitest'
import { formatBRL } from '../utils/currency'

describe('formatBRL', () => {
  it('returns "—" for null', () => {
    expect(formatBRL(null)).toBe('—')
  })

  it('returns "—" for undefined', () => {
    expect(formatBRL(undefined)).toBe('—')
  })

  it('formats 0 cents as R$ 0,00', () => {
    expect(formatBRL(0)).toMatch(/0,00/)
  })

  it('formats 100 cents (R$ 1,00)', () => {
    expect(formatBRL(100)).toMatch(/1,00/)
  })

  it('formats 9990 cents (R$ 99,90)', () => {
    expect(formatBRL(9990)).toMatch(/99,90/)
  })

  it('formats 100000 cents (R$ 1.000,00) with thousand separator', () => {
    const result = formatBRL(100000)
    expect(result).toMatch(/1\.000,00/)
  })

  it('formats 25050 cents (R$ 250,50)', () => {
    expect(formatBRL(25050)).toMatch(/250,50/)
  })

  it('includes R$ prefix', () => {
    expect(formatBRL(500)).toContain('R$')
  })

  it('formats 1 cent as R$ 0,01', () => {
    expect(formatBRL(1)).toMatch(/0,01/)
  })

  it('formats large value 10000000 cents (R$ 100.000,00)', () => {
    const result = formatBRL(10000000)
    expect(result).toMatch(/100\.000,00/)
  })
})
