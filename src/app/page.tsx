import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Activity, Users, Plane, Coins, AlertCircle, Clock } from "lucide-react"
import { createClient } from "@/utils/supabase/server"

// Function to calculate relative time
function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seg atrás`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas atrás`;
  return `${Math.floor(diffInSeconds / 86400)} dias atrás`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Fetch System Metrics
  // Since we don't have a complex aggregation query ready, we'll do simple counts
  const { count: totalEmissions } = await supabase
    .from('extracted_bookings')
    .select('*', { count: 'exact', head: true });

  const { data: milesData } = await supabase
    .from('extracted_bookings')
    .select('miles_used');

  const totalMiles = milesData?.reduce((acc, curr) => acc + (curr.miles_used || 0), 0) || 0;
  const totalPassengers = totalEmissions || 0; // Simplified for MVP

  // 2. Fetch Integrations Status
  const { data: integrations } = await supabase
    .from('airline_integrations')
    .select('*')
    .order('airline', { ascending: true });

  // 3. Fetch Recent Emissions
  const { data: recentEmissions } = await supabase
    .from('extracted_bookings')
    .select('*')
    .order('capture_date', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Principal</h1>
        <p className="text-slate-400 mt-1">Visão geral da operação, extrações e metadados do sistema.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Metric Cards */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-slate-700 transition-colors group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300 group-hover:text-cyan-400 transition-colors">Emissões Extraídas</CardTitle>
            <Plane className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{(totalEmissions || 0).toLocaleString('pt-BR')}</div>
            <p className="text-xs text-slate-500 bg-slate-950/50 rounded-full px-2 py-0.5 inline-block mt-2 border border-slate-800">+ Real-time fetch</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-slate-700 transition-colors group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300 group-hover:text-cyan-400 transition-colors">Passageiros (Est.)</CardTitle>
            <Users className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{(totalPassengers || 0).toLocaleString('pt-BR')}</div>
            <p className="text-xs text-slate-500 bg-slate-950/50 rounded-full px-2 py-0.5 inline-block mt-2 border border-slate-800">+ Real-time fetch</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-slate-700 transition-colors group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300 group-hover:text-cyan-400 transition-colors">Milhas Capturadas</CardTitle>
            <Coins className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalMiles.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-slate-500 bg-slate-950/50 rounded-full px-2 py-0.5 inline-block mt-2 border border-slate-800">+ Real-time fetch</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-slate-700 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">System Health</CardTitle>
            <Activity className="h-4 w-4 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">Normal</div>
            <div className="flex items-center text-xs text-slate-400 bg-slate-950/30 rounded-full px-2 py-0.5 inline-flex mt-2 border border-slate-800/50">
              <AlertCircle className="mr-1 h-3 w-3" /> 0 alertas críticos
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Últimas Emissões Coletadas (BD Real)</CardTitle>
            <CardDescription className="text-slate-400">
              Nossas extrações mais recentes gravadas no banco de dados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-slate-800/60 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-950/80">
                  <TableRow className="border-slate-800/60 hover:bg-transparent">
                    <TableHead className="text-slate-300">Cia</TableHead>
                    <TableHead className="text-slate-300">Localizador</TableHead>
                    <TableHead className="text-slate-300">Passageiro</TableHead>
                    <TableHead className="text-slate-300">Trecho</TableHead>
                    <TableHead className="text-slate-300 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEmissions && recentEmissions.length > 0 ? (
                    recentEmissions.map((e) => (
                      <TableRow key={e.id} className="border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                        <TableCell className="font-medium text-slate-200">
                          <span className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${e.airline.toLowerCase() === 'azul' ? 'bg-blue-500' : e.airline.toLowerCase() === 'latam' ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                            {e.airline}
                          </span>
                        </TableCell>
                        <TableCell className="text-cyan-400 font-mono text-sm tracking-wider">{e.locator}</TableCell>
                        <TableCell className="text-slate-300">{e.passenger_name}</TableCell>
                        <TableCell className="text-slate-400">{e.origin} - {e.destination}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={e.status === 'synced' ? 'default' : 'secondary'}
                            className={e.status === 'synced' ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/20'}>
                            {e.status === 'synced' ? 'Sincronizado' : 'Pendente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-slate-500">
                        Nenhuma emissão encontrada no banco de dados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-900/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <CardHeader>
            <CardTitle className="text-white">Status dos Integradores</CardTitle>
            <CardDescription className="text-slate-400">
              Verificando na tabela airline_integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            {integrations && integrations.length > 0 ? (
              integrations.map((i) => (
                <div key={i.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-800/60 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`relative flex h-3 w-3`}>
                      {i.status === 'active' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${i.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : i.status === 'error' ? 'bg-red-500' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}></span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200 capitalize">{i.airline}</h4>
                      <p className="text-xs text-slate-500 flex items-center mt-0.5">
                        <Clock className="w-3 h-3 mr-1" /> Último sync: {i.last_sync ? getRelativeTime(i.last_sync) : 'Nunca'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs px-2 py-0 border ${i.status === 'active' ? 'border-green-500/30 text-green-400 bg-green-500/5' : i.status === 'error' ? 'border-red-500/30 text-red-400 bg-red-500/5' : 'border-amber-500/30 text-amber-400 bg-amber-500/5'}`}>
                    {i.status === 'active' ? 'Operante' : i.status === 'waiting_auth' ? 'Req. Auth SMS' : i.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-800 rounded-lg">
                Nenhum integrador registrado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
