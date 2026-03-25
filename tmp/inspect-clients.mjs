import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

async function inspect() {
    const auth = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'CLIENTS!A1:Z5',
        });
        console.log(JSON.stringify(response.data.values, null, 2));
    } catch (e) {
        console.error(e.message);
    }
}

inspect();
