/**
 * Brazilian data validators
 * All return { valid: boolean; error?: string }
 */

export function validateCPF(cpf: string): { valid: boolean; error?: string } {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return { valid: false, error: 'CPF deve ter 11 dígitos' }
  if (/^(\d)\1{10}$/.test(digits)) return { valid: false, error: 'CPF inválido' }

  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += parseInt(digits[i]) * (len + 1 - i)
    const rem = (sum * 10) % 11
    return rem >= 10 ? 0 : rem
  }

  if (calc(9) !== parseInt(digits[9]) || calc(10) !== parseInt(digits[10])) {
    return { valid: false, error: 'CPF inválido' }
  }
  return { valid: true }
}

export function validateCNPJ(cnpj: string): { valid: boolean; error?: string } {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return { valid: false, error: 'CNPJ deve ter 14 dígitos' }
  if (/^(\d)\1{13}$/.test(digits)) return { valid: false, error: 'CNPJ inválido' }

  const calc = (len: number) => {
    let sum = 0
    let pos = len - 7
    for (let i = len; i >= 1; i--) {
      sum += parseInt(digits[len - i]) * pos--
      if (pos < 2) pos = 9
    }
    const rem = sum % 11
    return rem < 2 ? 0 : 11 - rem
  }

  if (calc(12) !== parseInt(digits[12]) || calc(13) !== parseInt(digits[13])) {
    return { valid: false, error: 'CNPJ inválido' }
  }
  return { valid: true }
}

export function validatePhone(phone: string): { valid: boolean; error?: string } {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 11) {
    return { valid: false, error: 'Telefone inválido (ex: 11999999999)' }
  }
  return { valid: true }
}

/** Format CPF: 000.000.000-00 */
export function formatCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

/** Format CNPJ: 00.000.000/0000-00 */
export function formatCNPJ(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

/** Format phone: (11) 99999-9999 or (11) 9999-9999 */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '').slice(0, 11)
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}
