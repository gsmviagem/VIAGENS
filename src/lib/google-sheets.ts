import { google } from 'googleapis';

/**
 * Interface representing a booking entry for the Google Sheet
 */
export interface SheetBooking {
    locator: string;
    airline: string;
    route: string;
    flightDate: string;
    passengerName: string;
    milesUsed: string | number;
    taxes: string | number;
    cabinClass: string;
    syncDate?: string;
}

/**
 * Google Sheets Service for synchronization
 */
export class GoogleSheetsService {
    private auth;
    private sheets;
    private spreadsheetId: string;

    constructor() {
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        this.spreadsheetId = process.env.GOOGLE_SHEET_ID || '';

        if (!clientEmail || !privateKey || !this.spreadsheetId) {
            console.warn('[GoogleSheets] Missing credentials or Spreadsheet ID');
        }

        this.auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    }

    /**
     * Appends a list of bookings to the Google Sheet
     */
    async appendBookings(bookings: SheetBooking[]): Promise<boolean> {
        try {
            if (!this.spreadsheetId) throw new Error('Spreadsheet ID not configured');

            const values = bookings.map(b => [
                b.locator,
                b.airline,
                b.route,
                b.flightDate,
                b.passengerName,
                b.milesUsed,
                b.taxes,
                b.cabinClass,
                new Date().toLocaleString('pt-BR')
            ]);

            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'A:I',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values
                }
            });

            return true;
        } catch (error: any) {
            console.error('[GoogleSheets] Error appending bookings:', error.message);
            return false;
        }
    }

    /**
     * Reads data from a specific range in the Google Sheet
     */
    async readSheetData(range: string): Promise<any[][] | null> {
        try {
            if (!this.spreadsheetId) throw new Error('Spreadsheet ID not configured');

            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range,
            });

            return response.data.values || [];
        } catch (error: any) {
            console.error(`[GoogleSheets] Error reading range ${range}:`, error.message);
            return null;
        }
    }

    /**
     * Updates data in a specific range in the Google Sheet
     */
    async updateSheetData(range: string, values: any[][]): Promise<boolean> {
        try {
            if (!this.spreadsheetId) throw new Error('Spreadsheet ID not configured');

            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values
                }
            });

            return true;
        } catch (error: any) {
            console.error(`[GoogleSheets] Error updating range ${range}:`, error.message);
            return false;
        }
    }

    /**
     * Checks if the service is properly configured
     */
    isConfigured(): boolean {
        return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SHEET_ID);
    }
}
