/**
 * Utility to export arrays of objects as CSV files.
 * No external dependencies — uses native browser APIs.
 */

/** Convert a 2D array of strings to a CSV string (RFC 4180). */
function arrayToCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`
    }
    return v
  }
  const lines = [headers, ...rows].map(row => row.map(escape).join(','))
  return lines.join('\r\n')
}

/** Trigger a browser download of the given content as a file. */
function downloadFile(content: string, filename: string, mime = 'text/csv;charset=utf-8;') {
  const BOM = '\uFEFF' // UTF-8 BOM so Excel opens correctly
  const blob = new Blob([BOM + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Appointment export ──────────────────────────────────────────────────────

export interface AppointmentExportRow {
  date: string
  patient: string
  professional: string
  status: string
  notes: string
  charge: string
  paid: string
}

export function exportAppointmentsCSV(rows: AppointmentExportRow[], filename: string) {
  const headers = ['Data', 'Paciente', 'Profissional', 'Status', 'Observações', 'Valor cobrado', 'Valor pago']
  const body = rows.map(r => [r.date, r.patient, r.professional, r.status, r.notes, r.charge, r.paid])
  downloadFile(arrayToCsv(headers, body), filename)
}

// ─── Patient export ──────────────────────────────────────────────────────────

export interface PatientExportRow {
  name: string
  cpf: string
  rg: string
  birthDate: string
  sex: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  zip: string
  notes: string
  createdAt: string
}

export function exportPatientsCSV(rows: PatientExportRow[], filename: string) {
  const headers = [
    'Nome', 'CPF', 'RG', 'Nascimento', 'Sexo', 'Telefone', 'E-mail',
    'Endereço', 'Cidade', 'UF', 'CEP', 'Observações', 'Cadastrado em',
  ]
  const body = rows.map(r => [
    r.name, r.cpf, r.rg, r.birthDate, r.sex, r.phone, r.email,
    r.address, r.city, r.state, r.zip, r.notes, r.createdAt,
  ])
  downloadFile(arrayToCsv(headers, body), filename)
}

// ─── Professional export ──────────────────────────────────────────────────────

export interface ProfessionalExportRow {
  name: string
  specialty: string
  councilId: string
  phone: string
  email: string
  active: string
  createdAt: string
}

export function exportProfessionalsCSV(rows: ProfessionalExportRow[], filename: string) {
  const headers = ['Nome', 'Especialidade', 'Conselho', 'Telefone', 'E-mail', 'Ativo', 'Cadastrado em']
  const body = rows.map(r => [r.name, r.specialty, r.councilId, r.phone, r.email, r.active, r.createdAt])
  downloadFile(arrayToCsv(headers, body), filename)
}

// ─── Finance export (payments) ────────────────────────────────────────────────

export interface FinanceExportRow {
  date: string
  patient: string
  professional: string
  chargeAmount: string
  paidAmount: string
  paidAt: string
  status: string
}

export function exportFinanceCSV(rows: FinanceExportRow[], filename: string) {
  const headers = ['Data', 'Paciente', 'Profissional', 'Valor cobrado', 'Valor pago', 'Pago em', 'Status']
  const body = rows.map(r => [r.date, r.patient, r.professional, r.chargeAmount, r.paidAmount, r.paidAt, r.status])
  downloadFile(arrayToCsv(headers, body), filename)
}

// ─── CSV parse (for import) ──────────────────────────────────────────────────

/** Parse a CSV string into { headers, rows }. Handles quoted fields. */
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  // Normalize line endings
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim() !== '')

  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
        else if (ch === '"') { inQuote = false }
        else { cur += ch }
      } else {
        if (ch === '"') { inQuote = true }
        else if (ch === ',') { result.push(cur.trim()); cur = '' }
        else { cur += ch }
      }
    }
    result.push(cur.trim())
    return result
  }

  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(parseRow)
  return { headers, rows }
}
