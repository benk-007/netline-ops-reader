import * as XLSX from 'xlsx';

/** Builds and triggers download of a CSV blob */
export function downloadCsv(headers, rows, filename, separator = ';') {
  const headerLine = headers.join(separator);
  const dataLines = rows.map(row =>
    row.map(v => {
      const str = v === null || v === undefined ? '' : String(v);
      return str.includes(separator) || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(separator)
  );
  const csv = [headerLine, ...dataLines].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Builds an XLSX workbook with a styled header row and triggers download */
export function downloadXlsx(headers, rows, filename, headerStyle = {}) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Apply header style
  const defaultHeaderStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: 'C8102E' } },
    ...headerStyle,
  };

  headers.forEach((_, colIndex) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex });
    if (!ws[cellAddress]) return;
    ws[cellAddress].s = defaultHeaderStyle;
  });

  // Auto-size columns
  ws['!cols'] = headers.map((h, i) => {
    let maxLen = String(h).length;
    for (const row of rows) {
      const cellLen = String(row[i] ?? '').length;
      if (cellLen > maxLen) maxLen = cellLen;
    }
    return { wch: Math.min(maxLen + 2, 40) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
}

/** Builds and downloads a styled users XLSX workbook */
export function buildUsersXlsx(users, appRoles) {
  const headers = ['Full Name', 'Matricule', 'Role', 'Status'];
  const rows = users.map((u, i) => {
    const rowStyle = i % 2 === 0
      ? { fill: { fgColor: { rgb: 'FFFFFF' } } }
      : { fill: { fgColor: { rgb: 'FFF5F5' } } };

    return [
      u.name || u.fullName || '',
      u.username || u.matricule || '',
      appRoles.find(r => r.key === u.role)?.label || u.role || '',
      u.status || (u.isActivated ? 'Active' : 'Inactive'),
    ].map(v => ({ v, s: rowStyle }));
  });

  const today = new Date().toLocaleDateString('en-CA');
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    ...rows.map(row => row.map(cell => cell.v)),
  ]);

  // Style header row
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: 'C8102E' } },
  };
  headers.forEach((_, colIndex) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex });
    if (!ws[cellAddress]) return;
    ws[cellAddress].s = headerStyle;
  });

  // Style data rows
  rows.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
      if (!ws[cellAddress]) return;
      ws[cellAddress].s = cell.s;
    });
  });

  // Auto-size columns
  ws['!cols'] = headers.map((h, i) => {
    let maxLen = String(h).length;
    rows.forEach(row => {
      const cellLen = String(row[i].v ?? '').length;
      if (cellLen > maxLen) maxLen = cellLen;
    });
    return { wch: Math.min(maxLen + 2, 40) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Users');

  const filename = `ram_users_${today}.xlsx`;
  XLSX.writeFile(wb, filename);
}
