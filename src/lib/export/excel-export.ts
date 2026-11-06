import * as XLSX from 'xlsx';

export function exportToExcel(filename: string, sheets: Array<{ name: string; data: Record<string, unknown>[] }>) {
  const wb = XLSX.utils.book_new();

  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.data);
    XLSX.utils.book_append_sheet(wb, ws, s.name.substring(0, 31)); // Excel max sheet name 31 chars
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToCsv(filename: string, data: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
