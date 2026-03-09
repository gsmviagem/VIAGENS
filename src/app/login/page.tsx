import { login, signup } from './actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlaneTakeoff, ShieldCheck, AlertCircle } from 'lucide-react'
import { SubmitButton } from './submit-button'

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LoginPage({ searchParams }: Props) {
    const resolvedSearchParams = await searchParams;
    const errorMsg = resolvedSearchParams?.error as string;
    const successMsg = resolvedSearchParams?.message as string;

    return (
        <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-900/20 rounded-full blur-[100px] pointer-events-none"></div>

            <Card className="w-full max-w-md bg-slate-900/80 border-slate-800 shadow-2xl backdrop-blur-xl relative z-10">
                <CardHeader className="space-y-3 pb-6 border-b border-slate-800/60 mb-6 px-8 tracking-tight">
                    <div className="flex justify-center mb-2">
                        <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800 shadow-inner">
                            <PlaneTakeoff className="h-8 w-8 text-cyan-400" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center text-white font-bold">GSMVIAGEM HUB</CardTitle>
                    <CardDescription className="text-center text-slate-400">
                        Acesso Restrito · Command Center Operacional
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-bold text-red-500 mb-1 leading-none">Erro Operacional</p>
                                <p className="text-red-200/80 leading-relaxed">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    {successMsg && (
                        <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <ShieldCheck className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-bold text-cyan-400 mb-1 leading-none">Ação Concluída</p>
                                <p className="text-cyan-100/80 leading-relaxed">{successMsg}</p>
                            </div>
                        </div>
                    )}
                    <form className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">Credencial (E-mail)</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="operador@gsmviagem.com.br"
                                required
                                className="bg-slate-950 border-slate-800 text-white focus-visible:ring-cyan-500 shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-slate-300">Senha de Acesso</Label>
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="bg-slate-950 border-slate-800 text-white focus-visible:ring-cyan-500 shadow-inner"
                            />
                        </div>

                        <div className="flex flex-col gap-3 pt-4">
                            <SubmitButton formAction={login} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-900/20 font-semibold py-5">
                                <ShieldCheck className="mr-2 h-5 w-5" /> Autenticar
                            </SubmitButton>
                            <SubmitButton formAction={signup} variant="outline" className="w-full border-slate-700 bg-transparent hover:bg-slate-800 text-slate-400">
                                Solicitar Acesso (Signup)
                            </SubmitButton>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
