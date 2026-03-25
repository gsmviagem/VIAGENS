import { GoogleSheetsService } from './src/lib/google-sheets.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspect() {
    const sheets = new GoogleSheetsService();
    // Headers are usually in Row 1 or 2
    const rows = await sheets.readSheetData('BASE!A6500:Z6505');
    if (!rows || rows.length === 0) {
        console.log('No data found');
        return;
    }
    rows.forEach((row, idx) => {
        console.log(`Row ${6500 + idx}:`, JSON.stringify(row));
    });




}

inspect();
