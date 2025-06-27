
import * as XLSX from 'xlsx';

interface ValidationError {
  cellAddress: string;
  row: number;
  column: string;
  message: string;
  type: 'phone' | 'email' | 'blank' | 'numeric' | 'date' | 'unique';
}

interface ProcessResult {
  data: {
    headers: string[];
    rows: any[][];
    originalData: any[];
  } | null;
  errors: ValidationError[];
}

export class ExcelProcessor {
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validatePhone(phone: string): boolean {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  }

  private validateDate(dateStr: string): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  private validateNumeric(value: string): boolean {
    return !isNaN(Number(value)) && isFinite(Number(value));
  }

  private getCellAddress(row: number, col: number): string {
    let result = '';
    while (col >= 0) {
      result = String.fromCharCode(65 + (col % 26)) + result;
      col = Math.floor(col / 26) - 1;
    }
    return result + (row + 1);
  }

  private validateRow(rowData: any, headers: string[], rowIndex: number): ValidationError[] {
    const errors: ValidationError[] = [];
    
    headers.forEach((header, colIndex) => {
      const value = rowData[header];
      const cellAddress = this.getCellAddress(rowIndex + 1, colIndex);
      
      // Check for blank mandatory fields
      if (value === undefined || value === null || value === '') {
        errors.push({
          cellAddress,
          row: rowIndex + 2, // +2 because we account for header row and 0-indexing
          column: header,
          message: 'This field cannot be empty',
          type: 'blank'
        });
        return;
      }

      const stringValue = String(value).trim();

      // Email validation
      if (header.toLowerCase().includes('email') && !this.validateEmail(stringValue)) {
        errors.push({
          cellAddress,
          row: rowIndex + 2,
          column: header,
          message: 'Invalid email format',
          type: 'email'
        });
      }

      // Phone validation
      if ((header.toLowerCase().includes('phone') || header.toLowerCase().includes('mobile')) && 
          !this.validatePhone(stringValue)) {
        errors.push({
          cellAddress,
          row: rowIndex + 2,
          column: header,
          message: 'Phone number must be exactly 10 digits',
          type: 'phone'
        });
      }

      // Age/Numeric validation
      if ((header.toLowerCase().includes('age') || 
           header.toLowerCase().includes('number') ||
           header.toLowerCase().includes('numeric')) && 
          !this.validateNumeric(stringValue)) {
        errors.push({
          cellAddress,
          row: rowIndex + 2,
          column: header,
          message: 'Must be a valid number',
          type: 'numeric'
        });
      }

      // Date validation
      if (header.toLowerCase().includes('date') && !this.validateDate(stringValue)) {
        errors.push({
          cellAddress,
          row: rowIndex + 2,
          column: header,
          message: 'Invalid date format',
          type: 'date'
        });
      }
    });

    return errors;
  }

  private checkUniqueConstraints(data: any[], headers: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    headers.forEach((header, colIndex) => {
      if (header.toLowerCase().includes('id') || 
          header.toLowerCase().includes('registration') ||
          header.toLowerCase().includes('unique')) {
        
        const values = new Map<string, number>();
        
        data.forEach((row, rowIndex) => {
          const value = String(row[header] || '').trim();
          if (value) {
            if (values.has(value)) {
              const originalRowIndex = values.get(value)!;
              const cellAddress = this.getCellAddress(rowIndex + 1, colIndex);
              
              errors.push({
                cellAddress,
                row: rowIndex + 2,
                column: header,
                message: `Duplicate value found (also in row ${originalRowIndex + 2})`,
                type: 'unique'
              });
            } else {
              values.set(value, rowIndex);
            }
          }
        });
      }
    });

    return errors;
  }

  async processFile(file: File): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Check if more than one sheet exists
          if (workbook.SheetNames.length > 1) {
            reject(new Error('Multiple sheets detected. Please upload a file with only one sheet.'));
            return;
          }
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            reject(new Error('The Excel sheet is empty'));
            return;
          }
          
          // Extract headers and data
          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1);
          
          // Convert to object format
          const objectData = dataRows.map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });
            return obj;
          });
          
          // Validate data
          let allErrors: ValidationError[] = [];
          
          // Row-by-row validation
          objectData.forEach((row, index) => {
            const rowErrors = this.validateRow(row, headers, index);
            allErrors = allErrors.concat(rowErrors);
          });
          
          // Unique constraint validation
          const uniqueErrors = this.checkUniqueConstraints(objectData, headers);
          allErrors = allErrors.concat(uniqueErrors);
          
          if (allErrors.length > 0) {
            resolve({
              data: null,
              errors: allErrors
            });
            return;
          }
          
          // Sort data alphabetically by the first column that looks like a name
          const nameColumn = headers.find(h => 
            h.toLowerCase().includes('name') || 
            h.toLowerCase().includes('title')
          ) || headers[0];
          
          const sortedData = [...objectData].sort((a, b) => {
            const aVal = String(a[nameColumn] || '').toLowerCase();
            const bVal = String(b[nameColumn] || '').toLowerCase();
            return aVal.localeCompare(bVal);
          });
          
          console.log('Excel processing completed successfully:', {
            headers,
            totalRows: sortedData.length,
            sortedBy: nameColumn
          });
          
          resolve({
            data: {
              headers,
              rows: sortedData.map(row => headers.map(header => row[header])),
              originalData: sortedData
            },
            errors: []
          });
          
        } catch (error) {
          reject(new Error('Failed to parse Excel file: ' + (error as Error).message));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read the file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }
}
