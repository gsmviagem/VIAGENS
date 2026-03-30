import { searchBuscaIdeal } from './src/connectors/quotation/busca-ideal-fetch';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.vercel_env' });

async function run() {
    console.log('Testing Busca Ideal...', process.env.BUSCA_IDEAL_USER ? 'User found' : 'No user');
    try {
        const res = await searchBuscaIdeal('GRU', 'JFK', '2026-06-15', 1);
        console.log(JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error('Fatal:', e);
    }
}

run();
