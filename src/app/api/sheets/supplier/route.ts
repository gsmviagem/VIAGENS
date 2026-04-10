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

        // Fetch BASE data for accurate Quant. Miles, Price p/mile mapping, and payment statuses
        const baseData = await sheetsService.readSheetData('BASE!H:Z');
        const baseMap: Record<string, { price: string, miles: string, paidMiles: boolean, paidTaxes: boolean, paidServ: boolean }> = {};

        if (baseData) {
            // H=0 (PNR) -> Z=18 (Supplier status)
            // K(Price p/mile) = 3, L(Quant. Miles) = 4
            // X(Emissão) = 16, Y(Taxas) = 17, Z(Supplier/Serviço) = 18
            for (let i = 1; i < baseData.length; i++) {
                const row = baseData[i];
                if (!row) continue;
                
                const pnr = (row[0] || '').trim().toUpperCase();
                if (pnr) {
                    baseMap[pnr] = {
                        price: row[3] || '0', 
                        miles: row[4] || '0',
                        paidMiles: (row[16] || '').trim() !== '',
                        paidTaxes: (row[17] || '').trim() !== '',
                        paidServ: (row[18] || '').trim() !== ''
                    };
                }
            }
        }

        // Fetch full names and PIX from DATA BASE!B:D (B=alias, C=full name, D=pix key)
        const supplierInfoMap: Record<string, { fullName: string, pix: string }> = {};
        const dbData = await sheetsService.readSheetData('DATA BASE!B:D');
        if (dbData) {
            for (const row of dbData) {
                if (!row || !row[0] || !row[1]) continue;
                const alias = row[0].trim().toLowerCase();
                const fullName = row[1].trim()
                    .toLowerCase()
                    .replace(/\b\w/g, (c: string) => c.toUpperCase());
                supplierInfoMap[alias] = { fullName, pix: row[2] ? row[2].trim() : '' };
            }
        }

        // Fetch supplier credits/payments from SUPPLIER!Z:AE
        // Z=0(SUPPLIER), AA=1(VALOR), AB=2(DETALHES), AC=3(SITUAÇÃO), AD=4(VALOR EMISSÃO), AE=5(PAGO/N PAGO)
        const manualCredits: Record<string, number> = {};
        const creditDetails: Record<string, { valor: number; valorFmt: string; detalhes: string }[]> = {};
        const creditData = await sheetsService.readSheetData('SUPPLIER!Z:AE');
        
        if (creditData) {
            for (let i = 1; i < creditData.length; i++) {
                const row = creditData[i];
                if (!row) continue;
                
                const creditSupplier = (row[0] || '').trim().toUpperCase();
                const creditVal = parseCurrency(row[1]);
                const creditDetalhes = (row[2] || '').trim(); // AB
                const creditSituacao = (row[3] || '').trim().toUpperCase();
                const creditPago = (row[5] || '').trim().toUpperCase();

                if (creditSupplier && creditVal > 0 && creditSituacao === 'OK' && creditPago === 'PAGO') {
                    manualCredits[creditSupplier] = (manualCredits[creditSupplier] || 0) + creditVal;
                    if (!creditDetails[creditSupplier]) creditDetails[creditSupplier] = [];
                    creditDetails[creditSupplier].push({
                        valor: creditVal,
                        valorFmt: formatCurrency(creditVal),
                        detalhes: creditDetalhes
                    });
                }
            }
        }

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
            if (!row || !row[0] || row[0].trim() === '') continue; 

            const dateStr = row[0];
            let rowDate = parseDateStr(dateStr);

            const rowLoc = (row[2] || '').trim().toUpperCase();
            
            const baseInfo = baseMap[rowLoc];
            const valMilesPrice = baseInfo ? baseInfo.price : (row[4] || '0');
            const valMilesQty = baseInfo ? baseInfo.miles : (row[5] || '0');

            // NEW STATUS LOGIC: Determine from BASE sheet instead of SAÍDAS
            // Default to NOT PAID (false) if baseInfo undefined, meaning we OWE it (pending)
            const isMilesPaid = baseInfo ? baseInfo.paidMiles : false;
            const isTaxesPaid = baseInfo ? baseInfo.paidTaxes : false;
            const isRepPaid   = baseInfo ? baseInfo.paidServ : false;

            const rowSupplierMiles = (row[6] || '').trim().toUpperCase();
            const valMiles = parseCurrency(row[7]);
            const rowSupplierTax = (row[8] || '').trim().toUpperCase();
            const valTax = parseCurrency(row[9]);
            const rowSupplierRep = (row[10] || '').trim().toUpperCase();
            const valRep = parseCurrency(row[11]);
            const paxName = row[1] || '';
            const product = row[3] || '';
            const totalStr = row[12] || '0';

            // Accumulate Debts - Only add to debt if it's NOT paid yet
            if (!isMilesPaid) {
                if (rowSupplierMiles) supplierDebts[rowSupplierMiles] = (supplierDebts[rowSupplierMiles] || 0) + valMiles;
            }
            if (!isTaxesPaid) {
                if (rowSupplierTax) supplierDebts[rowSupplierTax] = (supplierDebts[rowSupplierTax] || 0) + valTax;
            }
            if (!isRepPaid) {
                if (rowSupplierRep) supplierDebts[rowSupplierRep] = (supplierDebts[rowSupplierRep] || 0) + valRep;
            }

            // Apply Filters for Ledger
            let include = true;
            let supplierOwedInThisRow = 0;

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
                        // Check if THIS searched supplier actually has anything pending here
                        let isSupplierPending = false;
                        if (rowSupplierMiles === reqSupp && !isMilesPaid) {
                            isSupplierPending = true;
                            supplierOwedInThisRow += valMiles;
                        }
                        if (rowSupplierTax === reqSupp && !isTaxesPaid) {
                            isSupplierPending = true;
                            supplierOwedInThisRow += valTax;
                        }
                        if (rowSupplierRep === reqSupp && !isRepPaid) {
                            isSupplierPending = true;
                            supplierOwedInThisRow += valRep;
                        }

                        if (pendingOnly && !isSupplierPending) {
                            include = false;
                        }
                    }
                } else if (pendingOnly) {
                    // If any of the parts are pending, keep it
                    if (isMilesPaid && isTaxesPaid && isRepPaid) {
                        include = false;
                    }
                }
            }
            
            if (pendingOnly && locator && locator.trim() !== '') {
                 if (isMilesPaid && isTaxesPaid && isRepPaid) {
                     include = false;
                 }
            }

            if (include) {
                let printIssueStatus = 'OK';
                // If anything is NOT paid, we mark the row as PENDENTE
                if (!isMilesPaid || !isTaxesPaid || !isRepPaid) {
                    printIssueStatus = 'PENDENTE';
                }

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
                    milesSupplier: rowSupplierMiles,
                    taxSupplier: rowSupplierTax,
                    isMilesPaid: isMilesPaid,
                    isTaxesPaid: isTaxesPaid
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
                const creditPaid = manualCredits[name] || 0;
                const saldo = creditPaid - totalDebtAmount;

                // Resolve full name and pix: search supplierInfoMap case-insensitively
                const nameLower = name.toLowerCase();
                const matchedInfo = supplierInfoMap[nameLower] ||
                    Object.entries(supplierInfoMap).find(([k]) => k.includes(nameLower) || nameLower.includes(k))?.[1];
                const fullName = matchedInfo?.fullName || name.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
                const pix = matchedInfo?.pix || '';

                return {
                    name,
                    fullName,
                    pix,
                    debt: formatCurrency(totalDebtAmount),
                    creditOk: formatCurrency(creditPaid),
                    creditDetails: creditDetails[name] || [],
                    creditPending: formatCurrency(0),
                    saldo: formatCurrency(Math.abs(saldo)),
                    saldoType: saldo > 0 ? 'POSITIVE' : (saldo < 0 ? 'NEGATIVE' : 'NEUTRAL'),
                    highlight: false
                };
            })
            .filter(s => parseCurrency(s.debt) > 0 || parseCurrency(s.creditOk) > 0)
            .sort((a, b) => parseCurrency(b.debt) - parseCurrency(a.debt));

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
