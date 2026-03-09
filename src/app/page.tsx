import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import {
  Activity, Users, Plane, Coins, AlertCircle, Clock,
  Settings, Zap, Database, Globe, RefreshCcw, TrendingUp
} from "lucide-react"
import { createClient } from "@/utils/supabase/server"

function getRelativeTime(dateString: string) {
  if (!dateString) return 'Nunca';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s atrás`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m atrás`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`;
  return `${Math.floor(diffInSeconds / 86400)}d atrás`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // Data Fetching
  const { count: totalEmissions } = await supabase
    .from('extracted_bookings')
    .select('*', { count: 'exact', head: true });

  const { data: milesData } = await supabase
    .from('extracted_bookings')
    .select('miles_used');

  const totalMiles = milesData?.reduce((acc, curr) => acc + (curr.miles_used || 0), 0) || 0;

  const { data: integrations } = await supabase
    .from('airline_integrations')
    .select('*')
    .order('airline', { ascending: true });

  const { data: recentEmissions } = await supabase
    .from('extracted_bookings')
    .select('*')
    .order('capture_date', { ascending: false })
    .limit(8);

  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden">
      {/* Background with Overlay */}
      {/* Background with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-30"
        style={{ backgroundImage: "url('/images/dashboard-bg.png')" }}
      ></div>
      <div className="absolute inset-0 bg-[#020817]/40 pointer-events-none"></div>

      <div className="relative z-10 space-y-8 pt-2">
        {/* Header section with some glow */}
        <div className="flex justify-between items-end animate-in fade-in slide-in-from-top-4 duration-1000">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase text-glow">
              Command Center
            </h1>
            <p className="text-cyan-400 font-mono text-xs tracking-widest mt-1 opacity-80">
              OPERATIONAL STATUS: <span className="text-green-400 animate-pulse">OPTIMIZED</span> | CORE_V3.1
            </p>
          </div>
          <div className="flex gap-4">
            <div className="glass px-4 py-2 rounded-full flex items-center gap-2 border-cyan-500/30">
              <RefreshCcw className="h-3 w-3 text-cyan-400 animate-spin-slow" />
              <span className="text-[10px] font-mono text-cyan-100/70">AUTO-REFRESH ENABLED</span>
            </div>
          </div>
        </div>

        {/* Main Grid: 3 Columns Pattern */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: Air Automations (3 cols) */}
          <div className="lg:col-span-3 space-y-4 animate-in fade-in slide-in-from-left-8 duration-700 stagger-1">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" /> Air Automations
              </h2>
              <Settings className="h-4 w-4 text-slate-500 cursor-pointer hover:text-white transition-colors" />
            </div>

            {/* Automation toggle cards */}
            {['AZUL', 'SMILES', 'LATAM'].map((airline, idx) => {
              const integration = integrations?.find(i => i.airline.toUpperCase() === airline);
              const isActive = integration?.status === 'active';

              const colorMap: any = {
                'AZUL': 'bg-blue-500/20 border-blue-500/30 text-blue-400',
                'SMILES': 'bg-orange-500/20 border-orange-500/30 text-orange-400',
                'LATAM': 'bg-red-500/20 border-red-500/30 text-red-500'
              };

              return (
                <div key={airline} className={`animate-in fade-in slide-in-from-left-4 duration-500`} style={{ animationDelay: `${(idx + 1) * 150}ms` }}>
                  <Card className="glass-card hover:translate-x-1 transition-all hover:shadow-[0_0_20px_-5px_oklch(0.7_0.15_200_/_30%)] border-l-4 overflow-hidden"
                    style={{ borderLeftColor: airline === 'AZUL' ? '#3b82f6' : airline === 'SMILES' ? '#f97316' : '#ef4444' }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-[10px] ${colorMap[airline]}`}>
                            {airline}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{airline}</h4>
                            <p className="text-[10px] text-slate-400 flex items-center">
                              <span className={`w-2 h-2 rounded-full mr-1.5 ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              {isActive ? 'Active | Monitoring' : 'Inactive | Offline'}
                            </p>
                          </div>
                        </div>
                        <Switch checked={isActive} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}

            <Card className="glass-card border-dashed border-slate-700 bg-transparent">
              <CardContent className="p-4 flex flex-col items-center justify-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
                <Activity className="h-5 w-5 text-slate-400 mb-1" />
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">System Health</span>
              </CardContent>
            </Card>
          </div>

          {/* CENTER: Live Issuing (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2 px-2">
              <Globe className="h-4 w-4 text-cyan-400" /> Live Issuing Feed
            </h2>

            <Card className="glass-card overflow-hidden animate-scanline">
              <CardContent className="p-0">
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="bg-white/5 sticky top-0 z-20 backdrop-blur-md">
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold text-slate-400 py-4 pl-6">Identifier</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Passenger</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Route</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold text-slate-400 text-right pr-6">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentEmissions && recentEmissions.length > 0 ? (
                        recentEmissions.map((e) => (
                          <TableRow key={e.id} className="border-white/5 group hover:bg-white/5 transition-colors">
                            <TableCell className="pl-6">
                              <div className="flex flex-col">
                                <span className="text-cyan-400 font-mono text-sm font-bold tracking-widest">{e.locator}</span>
                                <span className="text-[9px] text-slate-500 uppercase">{e.airline}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-slate-300 text-sm font-medium">{e.passenger_name}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <span>{e.origin}</span>
                                <Plane className="h-3 w-3 rotate-90 text-slate-600" />
                                <span>{e.destination}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <span className="text-[10px] font-mono text-slate-500">{getRelativeTime(e.capture_date)}</span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-20 text-slate-500">
                            NO DATA CAPTURED IN CURRENT CYCLE
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Status & KPIs (3 cols) */}
          <div className="lg:col-span-3 space-y-6 animate-in fade-in slide-in-from-right-8 duration-700 stagger-3">

            {/* Sync Card */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2 px-2">
                <Database className="h-4 w-4 text-green-400" /> Google Sheets Sync
              </h2>
              <Card className="glass-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[10px] font-bold text-green-400 tracking-widest uppercase">STATUS: ACTIVE</div>
                      <div className="text-[9px] text-slate-500 font-mono">ID: gsh_f542s_prod</div>
                    </div>
                    <Switch checked={true} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500">Last Sync:</span>
                      <span className="text-slate-300">2m ago</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500">Sync Details:</span>
                      <span className="text-slate-300">3 emitentes sob id: 25.803/53</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Financial KPIs */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2 px-2">
                <TrendingUp className="h-4 w-4 text-cyan-400" /> Financial KPIs
              </h2>
              <Card className="glass-card hover:shadow-[0_0_20px_-5px_oklch(0.7_0.15_200_/_30%)] transition-all group">
                <CardContent className="p-5 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="group-hover:translate-y-[-2px] transition-transform">
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Avg Profit per Ticket</div>
                      <div className="text-lg font-black text-white">$112.50</div>
                      <div className="text-[9px] text-green-400 flex items-center">
                        <TrendingUp className="h-2 w-2 mr-1" /> 8.3%
                      </div>
                    </div>
                    <div className="group-hover:translate-y-[-2px] transition-transform">
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Total Points Logged (MM)</div>
                      <div className="text-lg font-black text-white">{(totalMiles / 1000000).toFixed(1)}M pts</div>
                      <div className="text-[9px] text-red-400 flex items-center">
                        <TrendingUp className="h-2 w-2 mr-1 rotate-180" /> 2.1%
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                    <div className="group-hover:translate-x-[2px] transition-transform">
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Revenue Today</div>
                      <div className="text-lg font-black text-white">$18,450.00</div>
                    </div>
                    <div className="group-hover:translate-x-[2px] transition-transform">
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Tickets Issued</div>
                      <div className="text-lg font-black text-white">{totalEmissions || 0}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
