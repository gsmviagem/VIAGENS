import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function ConfiguracoesPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Configurações do Sistema</h1>
                    <p className="text-slate-400 mt-1">Gerencie chaves, parâmetros de robôs e preferências de alerta.</p>
                </div>
            </div>

            <Tabs defaultValue="geral" className="w-full">
                <TabsList className="bg-slate-950 border border-slate-800 p-1 mb-6 h-auto flex flex-wrap gap-1">
                    <TabsTrigger value="geral" className="data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-400 text-slate-400 py-2 px-4 rounded-md">Geral</TabsTrigger>
                    <TabsTrigger value="automacao" className="data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-400 text-slate-400 py-2 px-4 rounded-md">Automação Extração</TabsTrigger>
                    <TabsTrigger value="planilha" className="data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-400 text-slate-400 py-2 px-4 rounded-md">Planilha / API</TabsTrigger>
                    <TabsTrigger value="seguranca" className="data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-400 text-slate-400 py-2 px-4 rounded-md">Segurança</TabsTrigger>
                </TabsList>

                <TabsContent value="geral">
                    <Card className="bg-slate-900/50 border-slate-800 shadow-xl">
                        <CardHeader className="border-b border-slate-800/60 pb-5 mb-5 bg-slate-900/20">
                            <CardTitle className="text-white">Perfil Operacional</CardTitle>
                            <CardDescription className="text-slate-400 mt-1">Gerecie suas informações básicas e o modo de exibição.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5 max-w-xl pb-6">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Nome de Exibição</Label>
                                <Input defaultValue="Operador Base" className="bg-slate-950 border-slate-800 text-white focus-visible:ring-cyan-500 shadow-inner shadow-black/20" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">E-mail para Alertas Críticos</Label>
                                <Input defaultValue="operador@gsmviagem.com.br" className="bg-slate-950 border-slate-800 text-white focus-visible:ring-cyan-500 shadow-inner shadow-black/20" />
                            </div>
                            <div className="pt-4 border-t border-slate-800">
                                <Button className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-900/20">Salvar Alterações</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="automacao">
                    <Card className="bg-slate-900/50 border-slate-800 shadow-xl">
                        <CardHeader className="border-b border-slate-800/60 pb-5 mb-5 bg-slate-900/20">
                            <CardTitle className="text-white flex items-center justify-between">
                                <span>Parâmetros de Automação</span>
                                <Badge variant="outline" className="text-cyan-400 border-cyan-800 bg-cyan-950/30">Motor V2 Ativo</Badge>
                            </CardTitle>
                            <CardDescription className="text-slate-400 mt-1">Ajuste o comportamento global e limites dos robôs nas companhias aéreas.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 max-w-xl pb-6">
                            <div className="space-y-2">
                                <Label className="text-slate-300 flex items-center justify-between">
                                    Intervalo Base (minutos)
                                    <span className="text-xs text-slate-500">Padrão: 30</span>
                                </Label>
                                <Input type="number" defaultValue="30" className="bg-slate-950 border-slate-800 text-white focus-visible:ring-cyan-500 font-mono shadow-inner shadow-black/20" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Modo de Operação Padrão</Label>
                                <select className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 shadow-inner shadow-black/20">
                                    <option value="auto">Automático Completo (Background total)</option>
                                    <option value="semi">Semiautomático (Com aprovação de SMS)</option>
                                    <option value="manual">Manual (Acionamento explícito)</option>
                                </select>
                            </div>
                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                <Button variant="outline" className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800">Restaurar Padrões</Button>
                                <Button className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-900/20">Atualizar Motor</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    )
}
