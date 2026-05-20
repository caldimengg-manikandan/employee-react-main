const fs = require('fs');
const path = require('path');
const XLSX = require('./frontend/node_modules/xlsx');

const file1 = 'c:/Users/user/Downloads/EXPENDITURE - FY 25-26  (HSR).xlsx';
const file2 = 'c:/Users/user/Downloads/Expenditure_Report_Hosur_January_2026 (1).xlsx';

let output = '';
function log(msg) {
  output += msg + '\n';
}

function inspectFile(filePath) {
  log(`========================================`);
  log(`INSPECTING FILE: ${filePath}`);
  log(`========================================`);
  if (!fs.existsSync(filePath)) {
    log(`File does not exist: ${filePath}`);
    return;
  }

  const workbook = XLSX.readFile(filePath);
  log(`Sheets: ${JSON.stringify(workbook.SheetNames)}`);
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    log(`\nSheet Name: ${sheetName}`);
    
    // Get row count & columns
    const ref = sheet['!ref'];
    log(`Range: ${ref}`);
    if (!ref) continue;
    
    // Parse range to get exact boundaries
    const range = XLSX.utils.decode_range(ref);
    log(`Rows: ${range.e.r - range.s.r + 1}, Cols: ${range.e.c - range.s.c + 1}`);

    // Print all rows of sheet
    const jsonRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    log('--- ALL ROWS ---');
    jsonRows.forEach((row, idx) => {
      // Print row elements nicely
      const formattedRow = row.map((val, cIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: idx, c: cIdx });
        const cell = sheet[cellRef];
        const formula = cell && cell.f ? ` [Formula: =${cell.f}]` : '';
        // If it's a date number, show the date
        return `${val}${formula}`;
      });
      log(`Row ${idx + 1}: ${JSON.stringify(formattedRow)}`);
    });

    log('--- MERGED CELLS ---');
    log(JSON.stringify(sheet['!merges'] || 'None'));
  }
}

inspectFile(file1);
inspectFile(file2);

fs.writeFileSync('excel_structure.txt', output);
console.log('Inspection complete. Written to excel_structure.txt');
