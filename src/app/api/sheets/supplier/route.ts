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

        // Fetch BASE data for accurate Quant. Miles, Price p/mile mapping
        const baseData = await sheetsService.readSheetData('BASE!G:K');
        const baseMilesMap: Record<string, { price: string, miles: string }> = {};

        if (baseData) {
            for (let i = 1; i < baseData.length; i++) {
                const row = baseData[i];
                if (!row) continue;
                // PNR mapping: G=0(PNR), J=3(Price), K=4(Miles)
                const pnr = (row[0] || '').trim().toUpperCase();
                if (pnr) {
                    baseMilesMap[pnr] = {
                        price: row[3] || '0', // Col J
                        miles: row[4] || '0'  // Col K
                    };
                }
            }
        }

        // Fetch supplier credits/payments from SUPPLIER!Z:AE
        // Z=0(SUPLIER), AA=1(VALOR), AB=2(DETALHES), AC=3(SITUAÇÃO), AD=4(VALOR EMISSÃO), AE=5(PAGO/N PAGO)
        const manualCredits: Record<string, number> = {};
        const creditData = await sheetsService.readSheetData('SUPPLIER!Z:AE');
        
        if (creditData) {
            // Skip headers (row 0 or 1 usually, let's start at 1 to be safe if 0 is empty)
            for (let i = 1; i < creditData.length; i++) {
                const row = creditData[i];
                if (!row) continue;
                
                const creditSupplier = (row[0] || '').trim().toUpperCase();
                const creditVal = parseCurrency(row[1]); // AA (1)
                const creditSituacao = (row[3] || '').trim().toUpperCase(); // AC (3)
                const creditPago = (row[5] || '').trim().toUpperCase(); // AE (5)

                // ONLY count if AC=OK AND AE=PAGO
                if (creditSupplier && creditVal > 0 && creditSituacao === 'OK' && creditPago === 'PAGO') {
                    manualCredits[creditSupplier] = (manualCredits[creditSupplier] || 0) + creditVal;
                }
            }
        }

        // Fetch ignore list separately from column AI
        const ignoreNames = new Set<string>();
        const ignoreData = await sheetsService.readSheetData('SUPPLIER!AI:AI');
        if (ignoreData) {
            for (let i = 1; i < ignoreData.length; i++) {
                const row = ignoreData[i];
                const name = (row?.[0] || '').trim().toUpperCase();
                if (name) {
                    ignoreNames.add(name);
                }
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
            
            const baseInfo = baseMilesMap[rowLoc];
            const valMilesPrice = baseInfo ? baseInfo.price : (row[4] || '0');
            const valMilesQty = baseInfo ? baseInfo.miles : (row[5] || '0');

            const rowSupplierMiles = (row[6] || '').trim().toUpperCase();
            const valMiles = parseCurrency(row[7]);
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

            // Accumulate Debts
            if (statusMiles === '') {
                if (rowSupplierMiles) supplierDebts[rowSupplierMiles] = (supplierDebts[rowSupplierMiles] || 0) + valMiles;
            }
            if (statusTax === '') {
                if (rowSupplierTax) supplierDebts[rowSupplierTax] = (supplierDebts[rowSupplierTax] || 0) + valTax;
            }
            if (statusRep === '') {
                if (rowSupplierRep) supplierDebts[rowSupplierRep] = (supplierDebts[rowSupplierRep] || 0) + valRep;
            }

            // Apply Filters for Ledger
            let include = true;
            let supplierOwedInThisRow = 0; // The amount specifically owed to the searched supplier for this row

            if (locator && locator.trim() !== '') {
                if (rowLoc !== locator.trim().toUpperCase()) include = false;
            } else {
                if (rowDate && filterStart && rowDate < filterStart) include = false;
                if (rowDate && filterEnd && rowDate > filterEnd) include = false;

                if (supplier && supplier.trim() !== '' && supplier !== 'TODOS') {
                    const reqSupp = supplier.trim().toUpperCase();
                    if (rowSupplierMiles !== reqSupp && rowSupplierTax !== reqSupp && rowSupplierRep !== reqSupp) {
                        include = false;
                    } else {
                        // If they appear in this row, calculate exactly how much is owed to THEM specifically
                        let isSupplierPending = false;
                        if (rowSupplierMiles === reqSupp && statusMiles === '') {
                            isSupplierPending = true;
                            supplierOwedInThisRow += valMiles;
                        }
                        if (rowSupplierTax === reqSupp && statusTax === '') {
                            isSupplierPending = true;
                            supplierOwedInThisRow += valTax;
                        }
                        if (rowSupplierRep === reqSupp && statusRep === '') {
                            isSupplierPending = true;
                            supplierOwedInThisRow += valRep;
                        }

                        if (pendingOnly && !isSupplierPending) {
                            include = false;
                        }
                    }
                } else if (pendingOnly) {
                    if (statusMiles !== '' && statusTax !== '' && statusRep !== '') {
                        include = false;
                    }
                }
            }
            
            if (pendingOnly && locator && locator.trim() !== '') {
                 if (statusMiles !== '' && statusTax !== '' && statusRep !== '') {
                     include = false;
                 }
            }

            if (include) {
                let printIssueStatus = 'OK';
                if (statusMiles === '' || statusTax === '' || statusRep === '') {
                    printIssueStatus = 'PENDENTE';
                }

                // If searching a specific supplier, show what they specifically are owed. Otherwise use total.
                const visualRowTotal = (supplier && supplier !== 'TODOS' && supplierOwedInThisRow > 0) 
                    ? formatCurrency(supplierOwedInThisRow) 
                    : `R$ ${totalStr.replace('R$', '').trim()}`;

                ledger.push({
                    date: dateStr,
                    loc: rowLoc,
                    product: product,
                    price: valMilesPrice, 
                    miles: valMilesQty, 
                    value: row[7] || '0', 
                    taxesCc: row[8] || '', 
                    tax: row[9] || '0',   
                    total: visualRowTotal,
                    issueStatus: printIssueStatus,
                    supplier: rowSupplierMiles || rowSupplierTax || rowSupplierRep,
                });
                
                filteredTotal += (supplier && supplier !== 'TODOS') ? supplierOwedInThisRow : parseCurrency(totalStr);

                const priceFormatted = valMilesPrice !== '0' ? `R$ ${valMilesPrice.replace('R$', '').trim()}` : '-';
                const taxFormatted = (row[9] && row[9] !== '0') ? `R$ ${row[9].replace('R$', '').trim()}` : 'R$ 0,00';
                const valFormatted = (row[7] && row[7] !== '0') ? `R$ ${row[7].replace('R$', '').trim()}` : 'R$ 0,00';

                generatedFullText += `*${dateStr} - ${rowLoc}*\nPAX: ${paxName}\nMILHAS: ${valMilesQty}K\nPREÇO: ${priceFormatted}\nVALOR (Milhas): ${valFormatted}\nTAXA: ${taxFormatted}\n*TOTAL DEVIDO: ${visualRowTotal}*\n\n`;
                generatedSummaryText += `${rowLoc} - ${visualRowTotal}\n`;
            }
        }

        // Consolidate Supplier List
        // A supplier appears if they have Debt (SAÍDAS) OR Credits from BASE (Z:AE)
        // Exclude names in the AI ignore list
        const allSuppliers = new Set([...Object.keys(supplierDebts), ...Object.keys(manualCredits)]);
        const suppliersList = Array.from(allSuppliers)
            .filter(name => name.trim() !== '' && !ignoreNames.has(name.trim().toUpperCase()))
            .map(name => {
                const totalDebtAmount = supplierDebts[name] || 0;
                const creditPaid = manualCredits[name] || 0; // Only AC=OK + AE=PAGO
                
                // Saldo Líquido = Credit Paid - Debt
                const saldo = creditPaid - totalDebtAmount;
                
                return {
                    name,
                    debt: formatCurrency(totalDebtAmount),
                    creditOk: formatCurrency(creditPaid),
                    creditPending: formatCurrency(0), // No pending concept anymore
                    saldo: formatCurrency(Math.abs(saldo)),
                    saldoType: saldo > 0 ? 'POSITIVE' : (saldo < 0 ? 'NEGATIVE' : 'NEUTRAL'),
                    highlight: false
                };
            })
            // Only show suppliers that actually have SOME financial activity
            .filter(s => parseCurrency(s.debt) > 0 || parseCurrency(s.creditOk) > 0)
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
