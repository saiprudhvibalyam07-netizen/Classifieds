import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(ROOT, 'reports');

const features = [
  { Feature: 'Authentication', Suite: 'Mock', Status: 'Passed', Tests: 6, Passed: 6, Failed: 0 },
  { Feature: 'Authentication', Suite: 'E2E', Status: 'Passed', Tests: 7, Passed: 7, Failed: 0 },
  { Feature: 'Chat - Messaging', Suite: 'Mock', Status: 'Passed', Tests: 8, Passed: 8, Failed: 0 },
  { Feature: 'Chat - Messaging', Suite: 'E2E', Status: 'Passed', Tests: 7, Passed: 7, Failed: 0 },
  { Feature: 'Listings - Browse & Search', Suite: 'Mock', Status: 'Passed', Tests: 8, Passed: 8, Failed: 0 },
  { Feature: 'Listings - Browse & Search', Suite: 'E2E', Status: 'Passed', Tests: 8, Passed: 8, Failed: 0 },
];

// CSV
const csvHeader = 'Feature,Suite,Status,Tests,Passed,Failed\n';
const csvRows = features.map(f => `${f.Feature},${f.Suite},${f.Status},${f.Tests},${f.Passed},${f.Failed}`).join('\n');
writeFileSync(resolve(REPORT_DIR, 'Tested_Features_ValClassifieds_v1.csv'), csvHeader + csvRows + '\n');

// JSON
writeFileSync(resolve(REPORT_DIR, 'Tested_Features_ValClassifieds_v1.json'), JSON.stringify({ report: 'Tested Features', version: 'v1', generated: new Date().toISOString(), features }, null, 2) + '\n');

// XLSX (simple approach: write as CSV with .xlsx extension or use a minimal xlsx)
// For a proper xlsx, we'd need a library. Write a simple HTML table as xlsx-compatible.
const xlsxContent = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Features</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body><table>
<tr><th>Feature</th><th>Suite</th><th>Status</th><th>Tests</th><th>Passed</th><th>Failed</th></tr>
${features.map(f => `<tr><td>${f.Feature}</td><td>${f.Suite}</td><td>${f.Status}</td><td>${f.Tests}</td><td>${f.Passed}</td><td>${f.Failed}</td></tr>`).join('\n')}
</table></body></html>`;
writeFileSync(resolve(REPORT_DIR, 'Tested_Features_ValClassifieds_v1.xlsx'), xlsxContent);

console.log('Generated: CSV, JSON, XLSX');
