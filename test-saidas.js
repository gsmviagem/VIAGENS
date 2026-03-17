const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function testSheets() {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!clientEmail || !privateKey || !spreadsheetId) {
        console.log('Missing env vars');
        return;
    }

    const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'SAÍDAS!A1:T20'
        });
        console.log(JSON.stringify(res.data.values, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}
testSheets();
