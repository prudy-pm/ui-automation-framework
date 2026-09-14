import * as XLSX from 'xlsx';
import path from 'path';

/**
 * Reads an Excel sheet (relative to the project root) into an array of
 * plain objects, one per row, keyed by the header row's column names.
 * Used where test data benefits from being editable by non-technical
 * stakeholders (e.g. a BA updating search terms) without touching JSON.
 */
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
