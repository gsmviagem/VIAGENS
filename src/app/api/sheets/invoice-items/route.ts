import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

function parseCurrency(val: string | undefined): number {
    if (!val) return 0;
    const clean = val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

export async function POST(req: NextRequest) {
    try {
        const { brokerName, companyName, startDate, endDate } = await req.json();
        
        const sheetsService = new GoogleSheetsService();
        if (!sheetsService.isConfigured()) {
            return NextResponse.json({ success: false, error: 'Not configured' }, { status: 500 });
        }

        // 1. Fetch emissions from BASE!B:Z
        // B=0(Date), E=3(Broker/Client), G=5(Pax), H=6(PNR), I=7(Product), J=8(Route), T=18(Client Paid)
        const baseData = await sheetsService.readSheetData('BASE!B3:Z');
        let emissions: any[] = [];
        
        if (baseData) {
            const filterStart = startDate ? new Date(startDate) : null;
            const filterEnd = endDate ? new Date(endDate) : null;
            if (filterEnd) filterEnd.setHours(23, 59, 59, 999);

            const bName = (brokerName || '').trim().toUpperCase();
            const cName = (companyName || '').trim().toUpperCase();

            emissions = baseData
                .filter(row => {
                    const rowClient = (row[3] || '').trim().toUpperCase();
                    
                    // Match either Broker or Company
                    const isMatch = (bName && rowClient === bName) || (cName && rowClient === cName);
                    if (!isMatch) return false;

                    // Date filter
                    if (row[0]) {
                        const [d, m, y] = row[0].split('/');
                        const rowDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                        if (filterStart && rowDate < filterStart) return false;
                        if (filterEnd && rowDate > filterEnd) return false;
                    }

                    // Check if already paid (Column W is different from empty)
                    if (row[21] && row[21].trim() !== '') return false;

                    return true;
                })
                .map(row => ({
                    date: row[0] || '',
                    pax: row[5] || '',
                    pnr: row[6] || '',
                    product: row[7] || '',
                    route: row[8] || '',
                    value: row[18] || '0' // Client Paid (Value to bill)
                }));
        }

        // 2. Fetch credits from CLIENTS!O3:T
        // O=0(Broker), P=1(Payment), Q=2(Paid), R=3(Type), S=4(Obs), T=5(Date)
        const clientsData = await sheetsService.readSheetData('CLIENTS!O3:T');
        let credits: any[] = [];

        if (clientsData) {
            const bName = (brokerName || '').trim().toUpperCase();
            const cName = (companyName || '').trim().toUpperCase();

            credits = clientsData
                .filter(row => {
                    const rowBroker = (row[0] || '').trim().toUpperCase();
                    return (bName && rowBroker === bName) || (cName && rowBroker === cName);
                })
                .map(row => ({
                    broker: row[0],
                    payment: row[1],
                    amount: parseCurrency(row[2]),
                    type: row[3],
                    date: row[5]
                }));
        }

        return NextResponse.json({
            success: true,
            data: {
                emissions,
                credits
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
