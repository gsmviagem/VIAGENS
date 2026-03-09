import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Download, Filter, MoreHorizontal } from "lucide-react"
import { createClient } from "@/utils/supabase/server"

// Formats full date to abbreviated format DD/MM/YYYY
function formatDate(dateStr: string) {
    const dt = new Date(dateStr)
    return dt.toLocaleDateString('pt-BR')
}

export default async function EmissoesPage() {
    const supabase = await createClient()

    const { data: emissions } = await supabase
        .from('extracted_bookings')
        .select('*')
        .order('flight_date', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Gerenciamento de Emissões</h1>
                    <p className="text-slate-400 mt-1">Consulte o painel de todas as emissões extraídas no Supabase.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300">
                        <Download className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                </div>
            </div>

            <Card className="bg-slate-900/80 border-slate-800 shadow-lg">
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                            <Input placeholder="Buscar por localizador..." className="pl-9 bg-slate-950 border-slate-800 focus-visible:ring-cyan-500 text-slate-200 w-full" />
                        </div>
                        <Button variant="outline" className="border-slate-700 bg-slate-950 text-slate-300 shrink-0">
                            <Filter className="mr-2 h-4 w-4" /> Filtros
                        </Button>
                    </div>

                    <div className="rounded-md border border-slate-800/60 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-950/80">
                                <TableRow className="border-slate-800/60 hover:bg-transparent">
                                    <TableHead className="text-slate-300">Data Voo / Origem</TableHead>
                                    <TableHead className="text-slate-300">Localizador</TableHead>
                                    <TableHead className="text-slate-300">Passageiro</TableHead>
                                    <TableHead className="text-slate-300">Trecho</TableHead>
                                    <TableHead className="text-slate-300 text-right">Valores</TableHead>
                                    <TableHead className="text-slate-300 text-center">Status DB</TableHead>
                                    <TableHead className="text-right text-slate-300"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {emissions && emissions.length > 0 ? (
                                    emissions.map((e) => (
                                        <TableRow key={e.id} className="border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                                            <TableCell>
                                                <div className="text-sm font-medium text-slate-300">{formatDate(e.flight_date)}</div>
                                                <div className="text-xs text-slate-500 mt-0.5 capitalize">{e.airline}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-mono text-sm font-semibold tracking-wider text-cyan-400 bg-cyan-950/30 px-2 py-1 rounded inline-block border border-cyan-900/50">{e.locator}</div>
                                            </TableCell>
                                            <TableCell className="text-slate-200 font-medium">{e.passenger_name}</TableCell>
                                            <TableCell className="text-slate-400">
                                                <div className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded bg-slate-950/80 border border-slate-800 text-xs font-mono">
                                                    {e.origin} <span className="text-cyan-500/50">→</span> {e.destination}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="text-sm font-mono text-slate-200">{Number(e.miles_used || 0).toLocaleString()} pts</div>
                                                {(e.cash_paid || e.taxes) && (
                                                    <div className="text-[10px] text-slate-500 mt-1">R$ {Number(e.cash_paid || 0).toFixed(2)} + tx</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline"
                                                    className={e.status === 'synced' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}>
                                                    {e.status === 'synced' ? 'Integrado' : e.status === 'pending_sync' ? 'Aguardando' : 'Erro'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-6 text-slate-500">
                                            Nenhuma emissão extraída ainda no banco de dados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
