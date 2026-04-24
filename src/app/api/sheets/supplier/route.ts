import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─── Aliases: variantes → nome canônico ───────────────────────────────────────
const SUPPLIER_ALIASES: Record<string, string> = {
    'LIMINAR NOSSA': 'JULIO BALCAO',
    'JULIO BALCÃO':  'JULIO BALCAO',
    'DAVI BALCÃO':   'DAVI BALCAO',
};

function normalizeSupplier(name: string): string {
    const upper = name.trim().toUpperCase();
    return SUPPLIER_ALIASES[upper] ?? upper;
}

function parseCurrency(val: string | undefined): number {
    if (!val) return 0;
    const clean = val.replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').trim();
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
                    const rowPaidMiles = (row[16] || '').trim() !== '';
                    const rowPaidTaxes = (row[17] || '').trim() !== '';
                    const rowPaidServ  = (row[18] || '').trim() !== '';
                    if (!baseMap[pnr]) {
                        baseMap[pnr] = {
                            price: row[3] || '0',
                            miles: row[4] || '0',
                            paidMiles: rowPaidMiles,
                            paidTaxes: rowPaidTaxes,
                            paidServ:  rowPaidServ
                        };
                    } else {
                        // Same LOC more than once (e.g. adult + infant):
                        // only consider paid if ALL rows for this LOC are paid
                        baseMap[pnr].paidMiles = baseMap[pnr].paidMiles && rowPaidMiles;
                        baseMap[pnr].paidTaxes = baseMap[pnr].paidTaxes && rowPaidTaxes;
                        baseMap[pnr].paidServ  = baseMap[pnr].paidServ  && rowPaidServ;
                    }
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
                
                const creditSupplier = normalizeSupplier(row[0] || '');
                const creditVal = parseCurrency(row[1]);
                const creditDetalhes = (row[2] || '').trim(); // AB
                const creditSituacao = (row[3] || '').trim().toUpperCase();
                const creditPago = (row[5] || '').trim().toUpperCase();

                if (creditSupplier && creditVal !== 0 && creditSituacao === 'OK' && creditPago === 'PAGO') {
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

        // Fetch excluded LOCs (emissions manually excluded from account)
        const excludedLocs = new Set<string>();
        const excludedData = await sheetsService.readSheetData('SUPPLIER!AK:AK');
        if (excludedData) {
            for (let i = 1; i < excludedData.length; i++) {
                const loc = (excludedData[i]?.[0] || '').trim().toUpperCase();
                if (loc) excludedLocs.add(loc);
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
            // Skip rows where LOC (col D = row[2]) is empty — date may be blank and that's OK
            const rowLocCheck = (row?.[2] || '').trim();
            if (!row || rowLocCheck === '') continue;

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

            const rowSupplierMiles = normalizeSupplier(row[6] || '');
            const valMiles = parseCurrency(row[7]);
            const rowSupplierTax = normalizeSupplier(row[8] || '');
            const valTax = parseCurrency(row[9]);
            const rowSupplierRep = normalizeSupplier(row[10] || '');
            const valRep = parseCurrency(row[11]);
            const paxName = row[1] || '';
            const product = row[3] || '';
            const totalStr = row[12] || '0';

            const isLocExcluded = excludedLocs.has(rowLoc);

            // Accumulate Debts - Only add to debt if NOT paid and NOT excluded
            if (!isLocExcluded) {
                if (!isMilesPaid) {
                    if (rowSupplierMiles) supplierDebts[rowSupplierMiles] = (supplierDebts[rowSupplierMiles] || 0) + valMiles;
                }
                if (!isTaxesPaid) {
                    if (rowSupplierTax) supplierDebts[rowSupplierTax] = (supplierDebts[rowSupplierTax] || 0) + valTax;
                }
                if (!isRepPaid) {
                    if (rowSupplierRep) supplierDebts[rowSupplierRep] = (supplierDebts[rowSupplierRep] || 0) + valRep;
                }
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
                        if (!isLocExcluded) {
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
                        }

                        // Excluded rows always visible (user needs to be able to re-include them)
                        if (pendingOnly && !isSupplierPending && !isLocExcluded) {
                            include = false;
                        }
                    }
                } else if (pendingOnly) {
                    // If any of the parts are pending, keep it
                    if (isMilesPaid && isTaxesPaid && isRepPaid && !isLocExcluded) {
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
                    isTaxesPaid: isTaxesPaid,
                    isExcluded: isLocExcluded,
                });
                
                if (!isLocExcluded) {
                    filteredTotal += (supplier && supplier !== 'TODOS') ? supplierOwedInThisRow : parseCurrency(totalStr);
                }

                const priceFormatted = valMilesPrice !== '0' ? `R$ ${valMilesPrice.replace('R$', '').trim()}` : '-';
                const taxFormatted = (row[9] && row[9] !== '0') ? `R$ ${row[9].replace('R$', '').trim()}` : 'R$ 0,00';
                const valFormatted = (row[7] && row[7] !== '0') ? `R$ ${row[7].replace('R$', '').trim()}` : 'R$ 0,00';

                generatedFullText += `*${dateStr} - ${rowLoc}*\nPAX: ${paxName}\nMILHAS: ${valMilesQty}K\nPREÇO: ${priceFormatted}\nVALOR (Milhas): ${valFormatted}\nTAXA: ${taxFormatted}\n*TOTAL DEVIDO: ${visualRowTotal}*\n\n`;
                generatedSummaryText += `${rowLoc} - ${visualRowTotal}\n`;
            }
        }

        // Append totals + credits to summary text
        if (generatedSummaryText) {
            const supplierKey = supplier?.trim().toUpperCase() || '';
            const creditVal = supplierKey ? (manualCredits[supplierKey] || 0) : 0;
            const creditDets = supplierKey ? (creditDetails[supplierKey] || []) : [];
            const netTotal = filteredTotal - creditVal;

            generatedSummaryText += `\nTOTAL BRUTO: ${formatCurrency(filteredTotal)}`;
            if (creditVal !== 0) {
                creditDets.forEach(c => {
                    generatedSummaryText += `\nCRÉDITO (${c.detalhes || 'Ajuste'}): ${c.valorFmt}`;
                });
                generatedSummaryText += `\nSALDO LÍQUIDO: ${formatCurrency(Math.abs(netTotal))}`;
            }
        }

        // Consolidate Supplier List
        // A supplier appears if they have Debt (SAÍDAS) OR Credits from BASE (Z:AE)
        // Exclude names in the AI ignore list
        const allSuppliers = new Set([...Object.keys(supplierDebts), ...Object.keys(manualCredits)]);
        // Dedup: agrupar por nome canônico (normalizeSupplier já unificou as chaves,
        // mas pode haver duplicatas remanescentes de variantes não cobertas)
        const deduped: Record<string, { debt: number; credit: number; creditDets: typeof creditDetails[string] }> = {};
        for (const name of Array.from(allSuppliers)) {
            if (name.trim() === '' || ignoreNames.has(name.trim().toUpperCase())) continue;
            const canonical = normalizeSupplier(name);
            if (!deduped[canonical]) deduped[canonical] = { debt: 0, credit: 0, creditDets: [] };
            deduped[canonical].debt   += supplierDebts[name]   || 0;
            deduped[canonical].credit += manualCredits[name]   || 0;
            deduped[canonical].creditDets.push(...(creditDetails[name] || []));
        }

        const suppliersList = Object.entries(deduped)
            .map(([name, { debt: totalDebtAmount, credit: creditPaid, creditDets }]) => {
                const saldo = creditPaid - totalDebtAmount;

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
                    creditDetails: creditDets,
                    creditPending: formatCurrency(0),
                    saldo: formatCurrency(Math.abs(saldo)),
                    saldoType: saldo > 0 ? 'POSITIVE' : (saldo < 0 ? 'NEGATIVE' : 'NEUTRAL'),
                    highlight: false
                };
            })
            .filter(s => parseCurrency(s.debt) > 0 || parseCurrency(s.creditOk) !== 0)
            .sort((a, b) => {
                const sign = (s: typeof a) => s.saldoType === 'NEGATIVE' ? -1 : (s.saldoType === 'POSITIVE' ? 1 : 0);
                const aVal = sign(a) * parseCurrency(a.saldo);
                const bVal = sign(b) * parseCurrency(b.saldo);
                return aVal - bVal; // most owed (most negative) first
            });

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalValue: formatCurrency(filteredTotal),
                },
                suppliers: suppliersList,
                ledger,
                excludedLocs: Array.from(excludedLocs),
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
