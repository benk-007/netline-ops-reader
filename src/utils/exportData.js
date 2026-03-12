/**
 * exportData.js — CSV & Excel export utilities
 * Used by: AdminPanel (export all users), TopBar ProfileModal (export own profile)
 */
import * as XLSX from 'xlsx'

// ── Column order & labels for user export ─────────────────────────────────────
const USER_COLUMNS = [
  { key: 'matricule',  label: 'Matricule'   },
  { key: 'name',       label: 'Full Name'   },
  { key: 'role',       label: 'Role'        },
  { key: 'airport',    label: 'Airport'     },
  { key: 'email',      label: 'Email'       },
  { key: 'phone',      label: 'Phone'       },
  { key: 'active',     label: 'Active'      },
  { key: 'lastLogin',  label: 'Last Login'  },
  { key: 'createdAt',  label: 'Created At'  },
]

// ── Trigger browser download ──────────────────────────────────────────────────
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Export users as CSV ───────────────────────────────────────────────────────
export function exportUsersCSV(users, filename = 'users.csv') {
  const header = USER_COLUMNS.map(c => c.label).join(',')
  const rows   = users.map(u =>
    USER_COLUMNS.map(c => {
      const val = u[c.key] ?? ''
      // Wrap in quotes if value contains comma or quote
      const str = String(val)
      return str.includes(',') || str.includes('"')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  )
  const csv  = [header, ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename)
}

// ── Export users as Excel (.xlsx) ─────────────────────────────────────────────
export function exportUsersXLSX(users, filename = 'users.xlsx') {
  const wsData = [
    USER_COLUMNS.map(c => c.label),   // header row
    ...users.map(u => USER_COLUMNS.map(c => u[c.key] ?? '')),
  ]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Auto-width columns
  const colWidths = USER_COLUMNS.map((c, i) => {
    const maxLen = Math.max(
      c.label.length,
      ...users.map(u => String(u[c.key] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Users')

  const buf  = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  triggerDownload(blob, filename)
}
