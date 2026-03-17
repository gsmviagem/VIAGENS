import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function parseCurrency(val: string | undefined): number {
    if (!val) return 0;
    const clean = val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

function formatCurrency(val: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function parseDateStr(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '') return null;
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
        // DD/MM/YYYY
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { startDate, endDate, supplier, locator, pendingOnly } = body;

        const sheetsService = new GoogleSheetsService();
        if (!sheetsService.isConfigured()) {
            return NextResponse.json({ success: false, error: 'Google Sheets não está configurado.' }, { status: 500 });
        }

        const rawData = await sheetsService.readSheetData('SAÍDAS!B:S');

        if (!rawData) {
            throw new Error('Falha ao ler dados da planilha SAÍDAS.');
        }

        const ledger: any[] = [];
        const supplierCredits: Record<string, number> = {};
        let filteredTotal = 0;

        const filterStart = startDate ? new Date(startDate) : null;
        let filterEnd = endDate ? new Date(endDate) : null;
        if (filterEnd) {
            filterEnd.setHours(23, 59, 59, 999); 
        }

        for (let i = 2; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || !row[0] || row[0].trim() === '') continue; // Skip if no Date

            const dateStr = row[0];
            let rowDate = parseDateStr(dateStr);

            const rowLoc = (row[2] || '').trim().toUpperCase();
            const rowSupplierMiles = (row[6] || '').trim().toUpperCase();
            const valMiles = parseCurrency(row[7]);
            const rowSupplierTax = (row[8] || '').trim().toUpperCase();
            const valTax = parseCurrency(row[9]);
            const rowSupplierRep = (row[10] || '').trim().toUpperCase();
            const valRep = parseCurrency(row[11]);
            
            const totalStr = row[12] || '0';

            const statusMiles = (row[15] || '').trim(); // Q
            const statusTax = (row[16] || '').trim(); // R
            const statusRep = (row[17] || '').trim(); // S

            // 1. Accumulate ALL supplier credits globally (independent of filters)
            if (statusMiles === '') {
                if (rowSupplierMiles) supplierCredits[rowSupplierMiles] = (supplierCredits[rowSupplierMiles] || 0) + valMiles;
            }
            if (statusTax === '') {
                if (rowSupplierTax) supplierCredits[rowSupplierTax] = (supplierCredits[rowSupplierTax] || 0) + valTax;
            }
            if (statusRep === '') {
                if (rowSupplierRep) supplierCredits[rowSupplierRep] = (supplierCredits[rowSupplierRep] || 0) + valRep;
            }

            // 2. Apply Filters for the Ledger
            let include = true;

            if (locator && locator.trim() !== '') {
                // If locator searched, ignore date and supplier
                if (rowLoc !== locator.trim().toUpperCase()) include = false;
            } else {
                // Date filter
                if (rowDate && filterStart && rowDate < filterStart) include = false;
                if (rowDate && filterEnd && rowDate > filterEnd) include = false;

                // Supplier filter
                if (supplier && supplier.trim() !== '' && supplier !== 'TODOS') {
                    const reqSupp = supplier.trim().toUpperCase();
                    if (rowSupplierMiles !== reqSupp && rowSupplierTax !== reqSupp && rowSupplierRep !== reqSupp) {
                        include = false;
                    } else if (pendingOnly) {
                        let isSupplierPending = false;
                        if (rowSupplierMiles === reqSupp && statusMiles === '') isSupplierPending = true;
                        if (rowSupplierTax === reqSupp && statusTax === '') isSupplierPending = true;
                        if (rowSupplierRep === reqSupp && statusRep === '') isSupplierPending = true;
                        if (!isSupplierPending) include = false;
                    }
                } else {
                    // No supplier specified, but pendingOnly checked
                    if (pendingOnly) {
                        if (statusMiles !== '' && statusTax !== '' && statusRep !== '') {
                            include = false;
                        }
                    }
                }
            }
            
            if (pendingOnly && locator && locator.trim() !== '') {
                 // Even if locating by ID, if pendingOnly is selected, we filter out non-pending
                 if (statusMiles !== '' && statusTax !== '' && statusRep !== '') {
                     include = false;
                 }
            }

            if (include) {
                // Determine general status for the UI badge based on the main matching portion
                let printIssueStatus = 'OK';
                if (statusMiles === '' || statusTax === '' || statusRep === '') {
                    printIssueStatus = 'PENDENTE';
                }

                ledger.push({
                    date: dateStr,
                    loc: rowLoc,
                    product: row[3] || '',
                    price: row[5] || '0', 
                    miles: row[4] || '0', 
                    value: row[7] || '0', 
                    taxesCc: row[8] || '', 
                    tax: row[9] || '0',   
                    total: totalStr,
                    issueStatus: printIssueStatus,
                    supplier: rowSupplierMiles || rowSupplierTax || rowSupplierRep,
                });
                filteredTotal += parseCurrency(totalStr);
            }
        }

        const suppliersList = Object.keys(supplierCredits)
            .filter(name => supplierCredits[name] > 0)
            .map(name => ({
                name,
                credit: formatCurrency(supplierCredits[name]),
                total: formatCurrency(supplierCredits[name]), 
                highlight: false
            }))
            .sort((a, b) => parseCurrency(b.credit) - parseCurrency(a.credit)); 

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalValue: formatCurrency(filteredTotal),
                },
                suppliers: suppliersList,
                ledger
            }
        });

    } catch (error: any) {
        console.error('[API/SUPPLIER] Error:', error.message);
        return NextResponse.json({ success: false, error: 'Erro ao buscar dados: ' + error.message }, { status: 500 });
    }
}
