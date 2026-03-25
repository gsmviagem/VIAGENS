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

        // 1. Fetch emissions from BASE!A3:AZ
        // A=0(Booking Date/empty?), B=1(Date), E=4(Broker/Client), G=6(Pax), H=7(PNR), I=8(Product), J=9(Route), T=19(Client Paid), W=22(Paid Details)
        const baseData = await sheetsService.readSheetData('BASE!A3:AZ');
        let emissions: any[] = [];
        
        if (baseData) {
            const filterStart = startDate ? new Date(startDate) : null;
            const filterEnd = endDate ? new Date(endDate) : null;
            if (filterEnd) filterEnd.setHours(23, 59, 59, 999); 

            const bName = (brokerName || '').trim().toUpperCase();
            const cName = (companyName || '').trim().toUpperCase();

            emissions = baseData
                .filter(row => {
                    if (!row || row.length < 5) return false;
                    const rowClient = (row[4] || '').trim().toUpperCase();
                    
                    // Match either Broker or Company
                    const isMatch = (bName && rowClient === bName) || (cName && rowClient === cName);
                    if (!isMatch) return false;

                    // CHECK IF PAID (Column V or W - Index 21 or 22)
                    // If either is not empty, it's paid, so we EXCLUDE it (return false)
                    const isVPaid = row[21] && row[21].trim() !== '';
                    const isWPaid = row[22] && row[22].trim() !== '';
                    if (isVPaid || isWPaid) return false;

                    // Date filter (Column B - Index 1)
                    if (row[1]) {
                        const parts = row[1].split('/');
                        if (parts.length === 3) {
                            const [d, m, y] = parts;
                            const rowDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                            if (filterStart && rowDate < filterStart) return false;
                            if (filterEnd && rowDate > filterEnd) return false;
                        }
                    }

                    return true;
                })
                .map(row => ({
                    date: row[1] || '',
                    pax: row[6] || '',
                    pnr: row[7] || '',
                    product: row[8] || '',
                    route: row[9] || '',
                    value: row[19] || '0' // Client Paid
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
