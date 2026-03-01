/**
 * Tests for the hasPermission() logic in AuthContext.
 *
 * We test by mocking supabase (so no network calls are made) and using
 * renderHook to get a live AuthContext value with a known profile.
 * The profile is injected by intercepting the fetchProfile supabase call.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuthContext } from '../contexts/AuthContext'

// ─── Mock supabase ────────────────────────────────────────────────────────────

const mockUnsubscribe = vi.fn()
const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockFrom = vi.fn()

vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        mockOnAuthStateChange(cb)
        // Simulate Supabase v2 firing INITIAL_SESSION after registration
        Promise.resolve()
          .then(() => mockGetSession())
          .then((res: { data: { session: unknown } }) => cb('INITIAL_SESSION', res.data.session))
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
      },
    },
    from: (table: string) => mockFrom(table),
  },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProfileRow(role: string) {
  return {
    id: 'user-test-1',
    clinic_id: 'clinic-1',
    roles: [role],
    name: 'Test User',
    is_super_admin: false,
  }
}

function mockSupabaseWithProfile(role: string) {
  const profileRow = makeProfileRow(role)
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: 'user-test-1' } } },
  })
  mockFrom.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: profileRow, error: null }),
      }),
    }),
  })
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return React.createElement(QueryClientProvider, { client },
    React.createElement(AuthProvider, null, children),
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('hasPermission — admin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseWithProfile('admin')
  })

  it('returns true for canViewPatients', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.hasPermission('canViewPatients')).toBe(true)
  })

  it('returns true for canManagePatients', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.hasPermission('canManagePatients')).toBe(true)
  })

  it('returns true for canViewFinancial', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.hasPermission('canViewFinancial')).toBe(true)
  })

  it('returns true for canManageSettings', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.hasPermission('canManageSettings')).toBe(true)
  })

  it('returns false for unknown permission key', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.hasPermission('nonExistentPermission')).toBe(false)
  })
})

describe('hasPermission — receptionist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseWithProfile('receptionist')
  })

  it('returns true for canViewPatients', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.hasPermission('canViewPatients')).toBe(true)
  })

  it('returns true for canManagePatients', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.hasPermission('canManagePatients')).toBe(true)
  })

  it('returns false for canManageProfessionals', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.hasPermission('canManageProfessionals')).toBe(false)
  })

  it('returns false for canViewFinancial', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.hasPermission('canViewFinancial')).toBe(false)
  })

  it('returns false for canManageSettings', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.hasPermission('canManageSettings')).toBe(false)
  })
})

describe('hasPermission — professional', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseWithProfile('professional')
  })

  it('returns true for canViewPatients', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.hasPermission('canViewPatients')).toBe(true)
  })

  it('returns false for canManagePatients', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.hasPermission('canManagePatients')).toBe(false)
  })

  it('returns true for canManageAgenda', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.hasPermission('canManageAgenda')).toBe(true)
  })

  it('returns false for canViewFinancial', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.hasPermission('canViewFinancial')).toBe(false)
  })
})

describe('hasPermission — patient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseWithProfile('patient')
  })

  it('returns false for all known permissions', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    const perms = ['canViewPatients', 'canManagePatients', 'canManageAgenda', 'canManageProfessionals', 'canViewFinancial', 'canManageSettings']
    for (const p of perms) {
      expect(result.current.hasPermission(p)).toBe(false)
    }
  })
})

describe('hasPermission — no session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } })
  })

  it('returns false when not logged in', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper })
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.hasPermission('canViewPatients')).toBe(false)
    expect(result.current.hasPermission('canManageSettings')).toBe(false)
  })
})
