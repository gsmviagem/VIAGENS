import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Plane, Clock, PlaneTakeoff, PlaneLanding, Settings2 } from "lucide-react"

const mockResults = [
    { id: 1, airline: 'Azul', flight: 'AD 4032', departure: '08:00', arrival: '09:20', duration: '1h 20m', miles: 15400, cash: 450.00, taxes: 42.50, available: 9 },
    { id: 2, airline: 'LATAM', flight: 'LA 3021', departure: '08:30', arrival: '09:45', duration: '1h 15m', miles: 12500, cash: 380.00, taxes: 45.00, available: 4 },
    { id: 3, airline: 'Smiles', flight: 'G3 1045', departure: '09:15', arrival: '10:35', duration: '1h 20m', miles: 18000, cash: 520.00, taxes: 38.00, available: 2 },
]

export default function BuscaPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Pesquisa de Passagens</h1>
                    <p className="text-slate-400 mt-1">Busca centralizada de voos em tempo real em todos os integradores.</p>
                </div>
            </div>

            <Card className="bg-slate-900/80 border-slate-800 shadow-lg">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Origem</Label>
                            <div className="relative">
                                <PlaneTakeoff className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                <Input placeholder="VCP" className="pl-9 bg-slate-950 border-slate-800 focus-visible:ring-cyan-500 text-slate-200" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Destino</Label>
                            <div className="relative">
                                <PlaneLanding className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                <Input placeholder="CNF" className="pl-9 bg-slate-950 border-slate-800 focus-visible:ring-cyan-500 text-slate-200" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Data de Ida</Label>
                            <Input type="date" className="bg-slate-950 border-slate-800 focus-visible:ring-cyan-500 text-slate-200" defaultValue="2026-03-15" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Companhia</Label>
                            <Select defaultValue="todas">
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-cyan-500">
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                    <SelectItem value="todas">Todas</SelectItem>
                                    <SelectItem value="azul">Azul</SelectItem>
                                    <SelectItem value="smiles">Smiles (Gol)</SelectItem>
                                    <SelectItem value="latam">LATAM</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-800">
                        <Button variant="ghost" className="text-slate-400 hover:text-cyan-400">
                            <Settings2 className="w-4 h-4 mr-2" /> Busca Avançada
                        </Button>
                        <Button className="bg-cyan-600 hover:bg-cyan-700 text-white min-w-[200px]">
                            <Search className="mr-2 h-4 w-4" /> Pesquisar Voos
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-medium text-slate-200">Resultados Encontrados (3)</h3>
                {mockResults.map(result => (
                    <Card key={result.id} className="bg-slate-900/40 border-slate-800/60 hover:border-cyan-900/50 hover:bg-slate-900/60 transition-colors">
                        <CardContent className="p-4 sm:p-6 flex flex-col lg:flex-row items-center justify-between gap-6">

                            {/* Flight Info */}
                            <div className="flex items-center gap-6 flex-1 w-full">
                                <div className="w-16 h-16 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-center shrink-0">
                                    <span className={`font-bold text-xl ${result.airline === 'Azul' ? 'text-blue-500' : result.airline === 'LATAM' ? 'text-red-500' : 'text-orange-500'}`}>{result.airline.substring(0, 2).toUpperCase()}</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="border-slate-700 text-slate-400 bg-slate-950/50">{result.airline}</Badge>
                                        <span className="text-sm text-slate-500 font-mono">{result.flight}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-slate-200 mt-2">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold tracking-tight">{result.departure}</div>
                                            <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">VCP</div>
                                        </div>
                                        <div className="flex-1 flex flex-col items-center">
                                            <span className="text-[10px] text-slate-500 mb-1">{result.duration}</span>
                                            <div className="w-full h-px bg-slate-800 relative flex items-center justify-center">
                                                <Plane className="w-4 h-4 text-cyan-500/50 absolute" />
                                            </div>
                                            <span className="text-[10px] text-green-500 mt-1">Direto</span>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold tracking-tight">{result.arrival}</div>
                                            <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">CNF</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="flex flex-col sm:flex-row items-center gap-6 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-8 min-w-[280px]">
                                <div className="space-y-1 text-center sm:text-left">
                                    <div className="text-sm text-slate-400">Em Milhas</div>
                                    <div className="text-3xl font-bold text-cyan-400 font-mono tracking-tight">{result.miles.toLocaleString()} <span className="text-sm text-slate-500 font-sans font-normal">pts</span></div>
                                    <div className="text-xs text-slate-500">+ R$ {result.taxes.toFixed(2)} taxas</div>
                                </div>
                                <div className="w-full sm:w-auto mt-2 sm:mt-0 space-y-2">
                                    <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold shadow-lg shadow-cyan-900/20">
                                        Selecionar
                                    </Button>
                                    <p className="text-center text-[10px] text-amber-500 font-medium">Apenas {result.available} assentos</p>
                                </div>
                            </div>

                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
