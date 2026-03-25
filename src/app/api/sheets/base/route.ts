import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function parseCurrency(val: string | undefined): number {
    if (!val) return 0;
    // Handle both R$ and US$ or $ formats, keep it generic for cleaning
    const clean = val.replace('R$', '').replace('US$', '').replace('$', '').replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

function formatCurrencyBRL(val: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function formatCurrencyUSD(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
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
    const startTime = Date.now();
    console.log(`[API/BASE] Request started at ${new Date().toISOString()}`);

    try {
        const body = await req.json();
        const { startDate, endDate, salesman, product, route } = body;

        const sheetsService = new GoogleSheetsService();
        if (!sheetsService.isConfigured()) {
            console.error('[API/BASE] Google Sheets not configured. Check env vars: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID');
            return NextResponse.json({ 
                success: false, 
                error: 'Google Sheets não está configurado. Verifique as variáveis de ambiente no Vercel.' 
            }, { status: 500 });
        }

        // Fetch BASE data from row 3 onwards (Look everything always)
        // Colunas da aba BASE (starting at B=0):
        // B(0): Booking Date, C(1): US$ Price, D(2): Salesman, E(3): Broker/Client
        // F(4): Num. Passengers, G(5): Pax Name, H(6): PNR, I(7): Product, J(8): Route
        // K(9): Price p/mile, L(10): Quant. Miles, P(14): Tax R$, Q(15): Tax US$
        // R(16): Sold, S(17): CC Taxes, T(18): Client Paid, U(19): Revenue
        // V(20): Pay To, X(22): Emissão, Y(23): Taxas, Z(24): Supplier, AH(32): MesAno

        console.log('[API/BASE] Fetching data from Google Sheets...');
        
        // Wrap Sheets call with a timeout to avoid silent hangs
        const timeoutMs = 55000; // 55s safety margin (maxDuration is 60s)
        const rawData = await Promise.race([
            sheetsService.readSheetData('BASE!B3:AH'),
            new Promise<null>((_, reject) => 
                setTimeout(() => reject(new Error(`Timeout: Google Sheets não respondeu em ${timeoutMs/1000}s`)), timeoutMs)
            )
        ]);

        const fetchDuration = Date.now() - startTime;
        console.log(`[API/BASE] Sheets fetch completed in ${fetchDuration}ms, rows: ${rawData?.length || 0}`);

        if (!rawData) {
            throw new Error('Falha ao ler dados da planilha BASE. Resposta vazia do Google Sheets.');
        }

        const ledger: any[] = [];
        const monthlyData: Record<string, { revenue: number, sales: number, pax: number, clientPaid: number }> = {};
        const salesmanData: Record<string, { revenue: number, sales: number, clientPaid: number }> = {};
        const productData: Record<string, { revenue: number, sales: number, miles: number }> = {};
        const routeData: Record<string, { revenue: number, sales: number }> = {};

        let totalRevenue = 0;
        let totalClientPaid = 0;
        let totalUnpaidClient = 0; // New: unpaid client billings
        let totalTaxBrl = 0;
        let totalTaxUsd = 0;
        let totalSales = 0;
        let totalPax = 0;
        let totalMiles = 0;
        let totalPricePerMileSum = 0;
        let countPricePerMile = 0;

        const filterStart = startDate ? new Date(startDate) : null;
        let filterEnd = endDate ? new Date(endDate) : null;
        if (filterEnd) {
            filterEnd.setHours(23, 59, 59, 999); 
        }

        // Loop through the rows and aggregate
        for (const row of rawData) {
            if (!row || !row[0] || row[0].trim() === '') continue; // Skip if no Booking Date

            const dateStr = row[0]; // B(0)
            let rowDate = parseDateStr(dateStr);

            const rowSalesman = (row[2] || '').trim().toUpperCase(); // D(2)
            const rowProduct = (row[7] || '').trim().toUpperCase(); // I(7)
            const rowRoute = (row[8] || '').trim().toUpperCase(); // J(8)
            const pnr = (row[6] || '').trim().toUpperCase(); // H(6)
            
            // Apply Filters
            let include = true;
            if (rowDate && filterStart && rowDate < filterStart) include = false;
            if (rowDate && filterEnd && rowDate > filterEnd) include = false;
            if (salesman && salesman !== 'TODOS' && rowSalesman !== salesman.toUpperCase()) include = false;
            if (product && product !== 'TODOS' && rowProduct !== product.toUpperCase()) include = false;
            if (route && route.trim() !== '' && !rowRoute.includes(route.toUpperCase())) include = false;

            if (include && pnr) { // Must have a PNR to be counted as a valid sale
                
                // Parse numeric columns
                const numPax = parseInt(row[4]) || 0; // F(4)
                const pricePerMile = parseCurrency(row[9]); // K(9)
                const quantMiles = Math.round(parseCurrency(row[10])); // L(10)
                const taxBrl = parseCurrency(row[14]); // P(14)
                const taxUsd = parseCurrency(row[15]); // Q(15)
                const clientPaid = parseCurrency(row[18]); // T(18)
                const revenue = parseCurrency(row[19]); // U(19)
                const mesAno = (row[32] || '').trim(); // AH(32)

                // Check Paid Status (Column V=20 relative to B=0)
                // Se a coluna V for vazia, significa que o cliente ainda NÃO PAGOU.
                const isPaid = (row[20] && row[20].trim() !== '');

                // 1. Global KPIs
                totalRevenue += revenue;
                totalClientPaid += clientPaid;
                if (!isPaid) {
                    totalUnpaidClient += clientPaid;
                }
                
                totalTaxBrl += taxBrl;
                totalTaxUsd += taxUsd;
                totalSales += 1;
                totalPax += numPax;
                totalMiles += quantMiles;
                
                if (pricePerMile > 0) {
                    totalPricePerMileSum += pricePerMile;
                    countPricePerMile += 1;
                }

                // 2. Ledger (Recent Sales)
                ledger.push({
                    date: dateStr,
                    loc: pnr,
                    salesman: rowSalesman,
                    product: rowProduct,
                    route: rowRoute,
                    client: (row[3] || '').trim(), // E(3)
                    revenue: formatCurrencyUSD(revenue),
                    clientPaid: formatCurrencyUSD(clientPaid),
                    status: isPaid ? 'PAID' : 'PENDING',
                    mesAno: mesAno
                });

                // 3. Aggregate Monthly
                if (mesAno) {
                    if (!monthlyData[mesAno]) monthlyData[mesAno] = { revenue: 0, sales: 0, pax: 0, clientPaid: 0 };
                    monthlyData[mesAno].revenue += revenue;
                    monthlyData[mesAno].sales += 1;
                    monthlyData[mesAno].pax += numPax;
                    monthlyData[mesAno].clientPaid += clientPaid;
                }

                // 4. Aggregate Salesman
                if (rowSalesman) {
                    if (!salesmanData[rowSalesman]) salesmanData[rowSalesman] = { revenue: 0, sales: 0, clientPaid: 0 };
                    salesmanData[rowSalesman].revenue += revenue;
                    salesmanData[rowSalesman].sales += 1;
                    salesmanData[rowSalesman].clientPaid += clientPaid;
                }

                // 5. Aggregate Product
                if (rowProduct) {
                    if (!productData[rowProduct]) productData[rowProduct] = { revenue: 0, sales: 0, miles: 0 };
                    productData[rowProduct].revenue += revenue;
                    productData[rowProduct].sales += 1;
                    productData[rowProduct].miles = Math.round(productData[rowProduct].miles + quantMiles);
                }

                // 6. Aggregate Route
                if (rowRoute) {
                    if (!routeData[rowRoute]) routeData[rowRoute] = { revenue: 0, sales: 0 };
                    routeData[rowRoute].revenue += revenue;
                    routeData[rowRoute].sales += 1;
                }
            }
        }

        // Format and Sort Aggregations
        const avgPricePerMile = countPricePerMile > 0 ? (totalPricePerMileSum / countPricePerMile) : 0;
        const avgTicket = totalSales > 0 ? (totalClientPaid / totalSales) : 0;

        const salesmenList = Object.keys(salesmanData)
            .map(name => ({
                name,
                revenueVal: salesmanData[name].revenue,
                revenue: formatCurrencyUSD(salesmanData[name].revenue),
                sales: salesmanData[name].sales,
                ticket: formatCurrencyUSD(salesmanData[name].clientPaid / salesmanData[name].sales)
            }))
            .sort((a, b) => b.revenueVal - a.revenueVal);

        const monthlyList = Object.keys(monthlyData)
            .map(mes => {
                // Parse YYYY-M or YYYY-MM to sortable value
                const [year, month] = mes.split('-').map(Number);
                return {
                    mesAno: mes,
                    sortKey: year * 100 + month,
                    revenueVal: monthlyData[mes].revenue,
                    revenue: formatCurrencyUSD(monthlyData[mes].revenue),
                    sales: monthlyData[mes].sales
                };
            })
            .sort((a, b) => a.sortKey - b.sortKey);
            
        const productList = Object.keys(productData)
            .map(prod => ({
                name: prod,
                revenueVal: productData[prod].revenue,
                revenue: formatCurrencyUSD(productData[prod].revenue),
                sales: productData[prod].sales,
                milesVal: productData[prod].miles
            }))
            .sort((a, b) => b.revenueVal - a.revenueVal);
            
        const routesList = Object.keys(routeData)
            .map(rt => ({
                name: rt,
                revenueVal: routeData[rt].revenue,
                revenue: formatCurrencyUSD(routeData[rt].revenue),
                sales: routeData[rt].sales
            }))
            .sort((a, b) => b.sales - a.sales) // Sort routes by volume (sales) usually makes more sense
            .slice(0, 30); // Top 30 rotas

        // Extract unique options for Dropdowns
        const uniqueSalesmen = Array.from(new Set(rawData.map((r: any) => (r[2] || '').trim().toUpperCase()).filter(Boolean))).sort();
        const uniqueProducts = Array.from(new Set(rawData.map((r: any) => (r[7] || '').trim().toUpperCase()).filter(Boolean))).sort();

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalRevenue: formatCurrencyUSD(totalRevenue),
                    totalClientPaid: formatCurrencyUSD(totalClientPaid),
                    totalUnpaidClient: formatCurrencyUSD(totalUnpaidClient), // New
                    totalTaxBrl: formatCurrencyBRL(totalTaxBrl),
                    totalTaxUsd: formatCurrencyUSD(totalTaxUsd),
                    totalSales,
                    totalPax,
                    totalMiles: totalMiles.toLocaleString('pt-BR'),
                    avgPricePerMile: formatCurrencyBRL(avgPricePerMile),
                    avgTicket: formatCurrencyUSD(avgTicket),
                    avgPaxPerSale: totalSales > 0 ? (totalPax / totalSales).toFixed(2) : '0'
                },
                salesmen: salesmenList,
                monthly: monthlyList,
                products: productList,
                routes: routesList,
                ledger: ledger.reverse().slice(0, 500), // Return last 500 sales for the table
                options: {
                    salesmen: uniqueSalesmen,
                    products: uniqueProducts
                }
            }
        });

    } catch (error: any) {
        const elapsed = Date.now() - startTime;
        console.error(`[API/BASE] Error after ${elapsed}ms:`, error.message);
        
        let userMessage = 'Erro ao buscar dados: ' + error.message;
        if (error.message?.includes('Timeout')) {
            userMessage = 'A planilha demorou muito para responder. Tente novamente em alguns instantes.';
        } else if (error.message?.includes('not configured') || error.message?.includes('credentials')) {
            userMessage = 'Credenciais do Google Sheets não configuradas. Verifique as variáveis de ambiente no Vercel.';
        }
        
        return NextResponse.json({ success: false, error: userMessage }, { status: 500 });
    }
}
