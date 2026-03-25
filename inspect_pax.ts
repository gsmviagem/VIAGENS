import { GoogleSheetsService } from './src/lib/google-sheets.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspect() {
    const sheets = new GoogleSheetsService();
    const rows = await sheets.readSheetData('BASE!A3:AZ');
    if (!rows || rows.length === 0) {
        console.log('No data found');
        return;
    }
    const client = 'SAVE AND FLY';
    const matches = rows.filter(r => (r[4] || '').toUpperCase().includes(client));
    
    let totalUnpaid = 0;
    let countUnpaid = 0;

    matches.forEach((row) => {
        const isVEmpty = !(row[21] && row[21].trim() !== '');
        const isWEmpty = !(row[22] && row[22].trim() !== '');
        
        if (isVEmpty && isWEmpty) {
            const val = parseFloat((row[19] || '0').replace(/\./g, '').replace(',', '.'));
            totalUnpaid += isNaN(val) ? 0 : val;
            countUnpaid++;
        }
    });

    console.log(`TOTAL UNPAID (V & W empty) for ${client}: R$ ${totalUnpaid.toLocaleString('pt-BR')}`);
    console.log(`COUNT UNPAID: ${countUnpaid}`);

}

inspect();
