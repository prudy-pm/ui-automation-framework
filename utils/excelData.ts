import * as XLSX from 'xlsx';
import path from 'path';

// Reads an Excel sheet into an array of objects, one per row, keyed by the header row.
export function readExcelSheet<T extends Record<string, unknown>>(
  relativePath: string,
  sheetName?: string
): T[] {
  const fullPath = path.resolve(__dirname, '..', relativePath);
  const workbook = XLSX.readFile(fullPath);
  const targetSheet = sheetName ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[targetSheet];
  return XLSX.utils.sheet_to_json<T>(sheet);
}
