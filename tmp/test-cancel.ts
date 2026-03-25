import { GoogleSheetsService } from '../src/lib/google-sheets';

async function test() {
    const sheets = new GoogleSheetsService();
    const data = await sheets.readSheetData('CANCEL!A1:Z5');
    console.log(data);
}
test().catch(console.error);
