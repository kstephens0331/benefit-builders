import XLSX from 'xlsx';

const workbook = XLSX.readFile('C:/Users/usmc3/Downloads/KYLE EXAMPLE.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log('Sheet Name:', sheetName);
console.log('\nFirst 40 rows:');
data.slice(0, 40).forEach((row, i) => {
  console.log(`Row ${i + 1}:`, JSON.stringify(row));
});
