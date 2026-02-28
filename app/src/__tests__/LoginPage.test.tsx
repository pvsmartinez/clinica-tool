/**
 * Tests for LoginPage component.
 *
 * LoginPage supports three views: login, forgot password, register.
 * It calls signInWithEmail / OAuth methods from useAuthContext.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSignInWithEmail = vi.fn()
const mockSignInWithGoogle = vi.fn()
const mockSignInWithFacebook = vi.fn()
const mockSignInWithApple = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuthContext: () => ({
    signInWithEmail: mockSignInWithEmail,
    signInWithGoogle: mockSignInWithGoogle,
    signInWithFacebook: mockSignInWithFacebook,
    signInWithApple: mockSignInWithApple,
  }),
}))

// Mock supabase (used in handleForgot via dynamic import)
vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

// ─── Login view ───────────────────────────────────────────────────────────────

describe('LoginPage — login view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignInWithEmail.mockResolvedValue({ error: null })
  })

  it('renders the "Entrar" heading', () => {
    renderLogin()
    expect(screen.getByRole('heading', { name: /Entrar/i })).toBeInTheDocument()
  })

  it('renders email and password inputs', () => {
    renderLogin()
    expect(screen.getByPlaceholderText(/seu@email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument()
  })

  it('renders all three OAuth buttons', () => {
    renderLogin()
    expect(screen.getByText(/Continuar com Google/i)).toBeInTheDocument()
    expect(screen.getByText(/Continuar com Facebook/i)).toBeInTheDocument()
    expect(screen.getByText(/Continuar com Apple/i)).toBeInTheDocument()
  })

  it('calls signInWithEmail with email and password on submit', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByPlaceholderText(/seu@email/i), 'admin@clinic.com')
    await user.type(screen.getByPlaceholderText(/••••••••/), 'password123')
    await user.click(screen.getByRole('button', { name: /^Entrar$/i }))

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith('admin@clinic.com', 'password123')
    })
  })

  it('shows error message on invalid credentials', async () => {
    mockSignInWithEmail.mockResolvedValue({ error: 'Invalid credentials' })
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByPlaceholderText(/seu@email/i), 'bad@bad.com')
    await user.type(screen.getByPlaceholderText(/••••••••/), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /^Entrar$/i }))

    await waitFor(() => {
      expect(screen.getByText(/E-mail ou senha inválidos/i)).toBeInTheDocument()
    })
  })

  it('calls signInWithGoogle when Google button clicked', async () => {
    mockSignInWithGoogle.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByText(/Continuar com Google/i))
    expect(mockSignInWithGoogle).toHaveBeenCalled()
  })

  it('calls signInWithFacebook when Facebook button clicked', async () => {
    mockSignInWithFacebook.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByText(/Continuar com Facebook/i))
    expect(mockSignInWithFacebook).toHaveBeenCalled()
  })
})

// ─── Forgot password view ─────────────────────────────────────────────────────

describe('LoginPage — forgot password view', () => {
  beforeEach(() => vi.clearAllMocks())

  it('switches to forgot password view when "Esqueceu?" is clicked', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /Esqueceu\?/i }))
    expect(screen.getByRole('heading', { name: /Recuperar senha/i })).toBeInTheDocument()
  })

  it('has a "Voltar para login" link that goes back to login', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /Esqueceu\?/i }))
    await user.click(screen.getByText(/Voltar para login/i))
    expect(screen.getByRole('heading', { name: /^Entrar$/i })).toBeInTheDocument()
  })
})

// ─── Register view ────────────────────────────────────────────────────────────

describe('LoginPage — register view', () => {
  beforeEach(() => vi.clearAllMocks())

  it('switches to register view when "Cadastre-se" is clicked', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /Cadastre-se/i }))
    expect(screen.getByRole('heading', { name: /Criar conta/i })).toBeInTheDocument()
  })

  it('shows Google and Apple buttons in register view (no Facebook)', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /Cadastre-se/i }))
    expect(screen.getByText(/Cadastrar com Google/i)).toBeInTheDocument()
    expect(screen.getByText(/Cadastrar com Apple/i)).toBeInTheDocument()
  })

  it('returns to login from register', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /Cadastre-se/i }))
    await user.click(screen.getByRole('button', { name: /Entrar/i }))
    expect(screen.getByRole('heading', { name: /^Entrar$/i })).toBeInTheDocument()
  })
})
