import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Terminal, Play, Pause, RefreshCw, KeyRound, CheckCircle2, XCircle } from "lucide-react"

const mockRobots = [
    { id: '1', name: 'Azul Extractor', airline: 'Azul', status: 'running', lastRun: '10 min atrás', sessionsStatus: 'valid' },
    { id: '2', name: 'Smiles Extractor', airline: 'Smiles', status: 'paused', lastRun: '2 horas atrás', sessionsStatus: 'expired' },
    { id: '3', name: 'LATAM Extractor', airline: 'LATAM', status: 'idle', lastRun: '5 min atrás', sessionsStatus: 'valid' },
]

const mockLogs = [
    { id: 1, time: '10:45:02', level: 'info', message: '[AZUL] Sessão iniciada. Buscando dados da data 2026-03-09' },
    { id: 2, time: '10:45:15', level: 'success', message: '[AZUL] Capturadas 3 novas emissões.' },
    { id: 3, time: '08:30:00', level: 'error', message: '[SMILES] Erro de autenticação. Sessão expirou (2FA Requerido).' },
    { id: 4, time: '08:15:22', level: 'info', message: '[LATAM] Sincronização finalizada sem novidades.' },
]

export default function AutoExtratorPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Módulo Auto-Extrator</h1>
                    <p className="text-slate-400 mt-1">Gerencie os conectores das companhias e acompanhe as rotinas de captura.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300">
                        <RefreshCw className="mr-2 h-4 w-4" /> Atualizar Status
                    </Button>
                    <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                        <Play className="mr-2 h-4 w-4" /> Executar Todos
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {mockRobots.map(robot => (
                    <Card key={robot.id} className="bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden flex flex-col group hover:border-slate-700 transition-colors">
                        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none transition-all ${robot.status === 'running' ? 'bg-green-500/20' : robot.status === 'paused' ? 'bg-amber-500/20' : 'bg-cyan-500/10'}`}></div>
                        <CardHeader className="pb-3 relative z-10">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg text-slate-200 group-hover:text-cyan-400 transition-colors">{robot.name}</CardTitle>
                                <Badge variant="outline" className={`${robot.status === 'running' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                                    robot.status === 'paused' ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' :
                                        'border-slate-500/50 text-slate-400 bg-slate-500/10'
                                    }`}>
                                    {robot.status === 'running' ? 'Executando' : robot.status === 'paused' ? 'Pausado' : 'Ocioso'}
                                </Badge>
                            </div>
                            <CardDescription className="text-slate-500">Companhia: {robot.airline}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4 relative z-10">
                            <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-slate-950/50 border border-slate-800/60">
                                <span className="text-slate-400">Sessão / Auth</span>
                                {robot.sessionsStatus === 'valid' ? (
                                    <span className="flex items-center text-green-400 font-medium"><CheckCircle2 className="w-4 h-4 mr-1" /> Válida</span>
                                ) : (
                                    <span className="flex items-center text-amber-500 font-medium"><XCircle className="w-4 h-4 mr-1" /> Exp. / Req. 2FA</span>
                                )}
                            </div>
                            <div className="flex items-center justify-between text-sm px-1">
                                <span className="text-slate-500">Última execução:</span>
                                <span className="text-slate-300 font-medium">{robot.lastRun}</span>
                            </div>
                        </CardContent>
                        <div className="p-4 border-t border-slate-800/60 bg-slate-900/80 flex flex-wrap gap-2 relative z-10">
                            {robot.sessionsStatus === 'expired' ? (
                                <Button size="sm" variant="outline" className="flex-1 bg-amber-950/20 text-amber-500 hover:bg-amber-900/30 border border-amber-900/50 hover:text-amber-400">
                                    <KeyRound className="w-4 h-4 mr-2" /> Validar SMS
                                </Button>
                            ) : (
                                <Button size="sm" variant="outline" className="flex-1 bg-slate-950/50 border-slate-800 hover:bg-slate-800 hover:text-cyan-400 text-slate-300">
                                    <RefreshCw className="w-4 h-4 mr-2" /> Forçar Sync
                                </Button>
                            )}
                            <Button size="sm" variant="default" className="flex-1 bg-cyan-900/30 text-cyan-400 border border-cyan-800/50 hover:bg-cyan-800/50 shadow-none">
                                {robot.status === 'paused' ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                                {robot.status === 'paused' ? 'Retomar' : 'Pausar'}
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="bg-[#0b101e] border-slate-800 shadow-2xl overflow-hidden mt-6">
                <CardHeader className="bg-slate-900/80 border-b border-slate-800 pb-3 py-3">
                    <CardTitle className="text-slate-300 flex items-center text-sm font-mono font-medium tracking-wide">
                        <Terminal className="w-4 h-4 mr-2 text-cyan-500" />
                        Terminal de Execução (Logs Recentes)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="font-mono text-xs sm:text-sm p-5 h-64 overflow-y-auto space-y-3">
                        {mockLogs.map(log => (
                            <div key={log.id} className="flex flex-col sm:flex-row sm:items-start gap-3 hover:bg-white/[0.02] p-1 -mx-1 rounded transition-colors">
                                <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                                <span className={`${log.level === 'error' ? 'text-red-400/90' :
                                    log.level === 'success' ? 'text-green-400/90' :
                                        'text-cyan-400/80'
                                    }`}>
                                    {log.message}
                                </span>
                            </div>
                        ))}
                        <div className="text-slate-600 mt-4 flex items-center">
                            <span className="mr-2">{'>'}</span> Acessando portal LATAM (aguardando proxy)...
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
