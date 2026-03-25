import { GoogleSheetsService } from './src/lib/google-sheets.js';
import dotenv from 'dotenv';
dotenv.config();

async function inspect() {
    const sheets = new GoogleSheetsService();
    const rows = await sheets.readSheetData('BASE!A1:Z5');
    console.log('Headers (Row 1):', rows[0]);
    console.log('Sample row (Row 3):', rows[2]);
}

inspect();
