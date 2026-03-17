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

        // Fetch core data from SAÍDAS
        const rawData = await sheetsService.readSheetData('SAÍDAS!B:T');
        if (!rawData) {
            throw new Error('Falha ao ler dados da planilha SAÍDAS.');
        }

        // Fetch manual credit ledger from SUPPLIER Z:AC
        // Z=0(SUPPLIER), AA=1(VALOR), AB=2(DETALHES), AC=3(SITUAÇÃO)
        const creditData = await sheetsService.readSheetData('SUPPLIER!Z2:AC1000');
        const manualCredits: Record<string, { ok: number, pending: number }> = {};
        
        if (creditData) {
            for (const row of creditData) {
                if (!row || !row[0]) continue;
                const suppName = row[0].trim().toUpperCase();
                const val = parseCurrency(row[1]);
                const status = (row[3] || '').trim().toUpperCase(); // AC column
                
                if (!manualCredits[suppName]) {
                    manualCredits[suppName] = { ok: 0, pending: 0 };
                }
                
                if (status === 'OK') {
                    manualCredits[suppName].ok += val;
                } else if (status === 'PENDENTE') {
                    manualCredits[suppName].pending += val;
                }
                // 'ABATIDO' is ignored
            }
        }

        const ledger: any[] = [];
        const supplierDebts: Record<string, number> = {};
        let filteredTotal = 0;
        let generatedFullText = '';
        let generatedSummaryText = '';

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
            const valMilesPrice = row[5] || '0'; // Price P/mile
            const valMilesQty = row[4] || '0'; // Quant. Miles
            const rowSupplierTax = (row[8] || '').trim().toUpperCase();
            const valTax = parseCurrency(row[9]);
            const rowSupplierRep = (row[10] || '').trim().toUpperCase();
            const valRep = parseCurrency(row[11]);
            const paxName = row[1] || '';
            const product = row[3] || '';
            
            const totalStr = row[12] || '0';

            const statusMiles = (row[15] || '').trim(); // Q
            const statusTax = (row[16] || '').trim(); // R
            const statusRep = (row[17] || '').trim(); // S

            // 1. Accumulate ALL supplier DEBTS globally (independent of filters)
            // If the status cell is empty, it means we OWE this money (it's pending payment)
            if (statusMiles === '') {
                if (rowSupplierMiles) supplierDebts[rowSupplierMiles] = (supplierDebts[rowSupplierMiles] || 0) + valMiles;
            }
            if (statusTax === '') {
                if (rowSupplierTax) supplierDebts[rowSupplierTax] = (supplierDebts[rowSupplierTax] || 0) + valTax;
            }
            if (statusRep === '') {
                if (rowSupplierRep) supplierDebts[rowSupplierRep] = (supplierDebts[rowSupplierRep] || 0) + valRep;
            }

            // 2. Apply Filters for the View Ledger
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
                    product: product,
                    price: valMilesPrice, 
                    miles: valMilesQty, 
                    value: row[7] || '0', 
                    taxesCc: row[8] || '', 
                    tax: row[9] || '0',   
                    total: totalStr,
                    issueStatus: printIssueStatus,
                    supplier: rowSupplierMiles || rowSupplierTax || rowSupplierRep,
                });
                filteredTotal += parseCurrency(totalStr);

                // Build Text Generator Strings
                const priceFormatted = valMilesPrice !== '0' ? `R$ ${valMilesPrice.replace('R$', '').trim()}` : '-';
                const totalFormatted = totalStr !== '0' ? `R$ ${totalStr.replace('R$', '').trim()}` : 'R$ 0,00';
                const taxFormatted = (row[9] && row[9] !== '0') ? `R$ ${row[9].replace('R$', '').trim()}` : 'R$ 0,00';
                const valFormatted = (row[7] && row[7] !== '0') ? `R$ ${row[7].replace('R$', '').trim()}` : 'R$ 0,00';

                generatedFullText += `*${dateStr} - ${rowLoc}*\nPAX: ${paxName}\nMILHAS: ${valMilesQty}K\nPREÇO: ${priceFormatted}\nVALOR: ${valFormatted}\nTAX: ${taxFormatted}\n*TOTAL: ${totalFormatted}*\n\n`;
                generatedSummaryText += `${rowLoc} - ${totalFormatted}\n`;
            }
        }

        // Consolidate Supplier List
        // A supplier appears if they have Debt (SAÍDAS) OR Manual Credits (Z:AC)
        const allSuppliers = new Set([...Object.keys(supplierDebts), ...Object.keys(manualCredits)]);
        const suppliersList = Array.from(allSuppliers)
            .filter(name => name.trim() !== '')
            .map(name => {
                const totalDebtAmount = supplierDebts[name] || 0;
                const creditOk = manualCredits[name]?.ok || 0;
                const creditPending = manualCredits[name]?.pending || 0;
                
                // Saldo Líquido = Credit OK - Debt
                const saldo = creditOk - totalDebtAmount;
                
                return {
                    name,
                    debt: formatCurrency(totalDebtAmount),
                    creditOk: formatCurrency(creditOk),
                    creditPending: formatCurrency(creditPending),
                    saldo: formatCurrency(Math.abs(saldo)),
                    saldoType: saldo > 0 ? 'POSITIVE' : (saldo < 0 ? 'NEGATIVE' : 'NEUTRAL'),
                    highlight: false
                };
            })
            // Only show suppliers that actually have SOME financial activity pending/owed
            .filter(s => parseCurrency(s.debt) > 0 || parseCurrency(s.creditOk) > 0 || parseCurrency(s.creditPending) > 0)
            .sort((a, b) => parseCurrency(b.debt) - parseCurrency(a.debt)); // sort by largest debt first

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalValue: formatCurrency(filteredTotal),
                },
                suppliers: suppliersList,
                ledger,
                generated: {
                    full: generatedFullText.trim(),
                    summary: generatedSummaryText.trim()
                }
            }
        });

    } catch (error: any) {
        console.error('[API/SUPPLIER] Error:', error.message);
        return NextResponse.json({ success: false, error: 'Erro ao buscar dados: ' + error.message }, { status: 500 });
    }
}
