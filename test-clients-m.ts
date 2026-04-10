import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { GoogleSheetsService } from './src/lib/google-sheets';

async function test() {
    console.log("---- Fetching CLIENTS!J3:M");
    const s = new GoogleSheetsService();
    const data = await s.readSheetData('CLIENTS!J3:M');
    console.log(data?.slice(0, 5));
}
test().catch(console.error);
