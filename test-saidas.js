const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function testSheets() {
    const auth = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    try {
        const res = await sheets.spreadsheets.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
        });
        res.data.sheets.forEach(s => {
            console.log(`Tab Name: ${s.properties.title}, GID: ${s.properties.sheetId}`);
        });
    } catch (err) {
        console.error('Error:', err.message);
    }
}
testSheets();
