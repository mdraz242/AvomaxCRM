import ExcelJS from 'exceljs';

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsvBuffer(columns, rows) {
  const header = columns.map(escapeCsvCell).join(',');
  const lines = rows.map((row) => columns.map((col) => escapeCsvCell(row[col])).join(','));
  const csv = [header, ...lines].join('\n');
  return Buffer.from(csv, 'utf-8');
}

export async function generateExcelBuffer(sheetTitle, columns, rows) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AvomaxCRM';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetTitle.slice(0, 31));
  sheet.columns = columns.map((col) => ({
    header: col,
    key: col,
    width: Math.max(16, col.length + 6)
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }
  };

  for (const row of rows) {
    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

