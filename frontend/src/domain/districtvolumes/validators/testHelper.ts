import ExcelJS from 'exceljs';

export async function buildXlsxFile(
  sheetName: string,
  rows: unknown[][],
  mergeCells?: string[],
): Promise<File> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  for (const row of rows) {
    ws.addRow(row);
  }
  if (mergeCells) {
    for (const range of mergeCells) {
      ws.mergeCells(range);
    }
  }
  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const fileName = sheetName.toLowerCase() + '.xlsx';
  return new File([buffer], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
