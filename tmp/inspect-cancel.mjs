import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Assuming we have .env.local with credentials
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'CANCEL!A1:Z5',
        });
        console.log("CANCEL SHEET HEADERS DATA:");
        console.log(JSON.stringify(res.data.values, null, 2));
    } catch (e) {
        console.error(e);
    }
}

check();
