'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

// Components extracted from Draft
function DashboardCard({
  title,
  icon,
  children,
  accentColor,
  headerExtra,
  bgIcon,
  className = ''
}: {
  title: string,
  icon: React.ReactNode,
  children: React.ReactNode,
  accentColor: string,
  headerExtra?: React.ReactNode,
  bgIcon?: React.ReactNode,
  className?: string
}) {
  const accentClass = accentColor === 'primary' ? 'text-primary border-primary/20 bg-primary/10' :
    accentColor === 'accent-blue' ? 'text-accent-blue border-accent-blue/20 bg-accent-blue/10' :
      accentColor === 'green' ? 'text-green-500 border-green-500/20 bg-green-500/10' :
        'text-slate-400 border-white/10 bg-white/5';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ borderColor: 'rgba(0, 255, 200, 0.4)' }}
      className={cn(
        "glass-panel rounded-2xl p-6 flex flex-col gap-6 transition-all group border border-white/5 relative overflow-hidden",
        className
      )}
    >
      {bgIcon && (
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          {bgIcon}
        </div>
      )}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", accentClass)}>
            {icon}
          </div>
          <h3 className="font-bold text-lg text-white">{title}</h3>
        </div>
        {headerExtra || <span className="material-symbols-outlined text-slate-500 cursor-pointer hover:text-white transition-colors">more_horiz</span>}
      </div>
      <div className="flex-1 flex flex-col relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

function ToggleItem({ label, sublabel, active, onToggle }: { label: string, sublabel: string, active: boolean, onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-slate-300">{label}</span>
        <span className="text-[10px] text-slate-500">{sublabel}</span>
      </div>
      <Switch checked={active} onCheckedChange={onToggle} />
    </div>
  );
}

function LiveItem({ title, time, details, status }: { title: string, time: string, details: string, status: 'primary' | 'accent-blue' }) {
  const borderClass = status === 'primary' ? 'border-primary' : 'border-accent-blue';
  return (
    <div className={cn("p-3 border-l-2 bg-white/5 rounded-r-lg", borderClass)}>
      <div className="flex justify-between mb-1">
        <span className="text-[11px] font-bold text-white uppercase tracking-wider">{title}</span>
        <span className="text-[10px] text-slate-500">{time}</span>
      </div>
      <p className="text-xs text-slate-400">{details}</p>
    </div>
  );
}

function SideCard({ icon, title, sub, value, status, statusColor }: { icon: string, title: string, sub: string, value: string, status: string, statusColor: string }) {
  return (
    <div className="glass-panel rounded-2xl p-5 flex-1 flex items-center gap-4 hover:bg-white/5 transition-all cursor-pointer group">
      <div className="size-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-all">
        <span className="material-symbols-outlined text-primary text-2xl">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
      <div className="ml-auto text-right">
        <p className="text-lg font-black text-white">{value}</p>
        <p className={cn("text-[10px] font-bold", statusColor)}>{status}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [syncProgress, setSyncProgress] = useState(82);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [recentEmissions, setRecentEmissions] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalMiles: 0, totalEmissions: 0 });
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { count: totalEmissions } = await supabase
        .from('extracted_bookings')
        .select('*', { count: 'exact', head: true });

      const { data: milesData } = await supabase
        .from('extracted_bookings')
        .select('miles_used');

      const totalMiles = milesData?.reduce((acc, curr) => acc + (curr.miles_used || 0), 0) || 0;

      const { data: integData } = await supabase
        .from('airline_integrations')
        .select('*')
        .order('airline', { ascending: true });

      const { data: recentData } = await supabase
        .from('extracted_bookings')
        .select('*')
        .order('capture_date', { ascending: false })
        .limit(8);

      setStats({ totalMiles, totalEmissions: totalEmissions || 0 });
      setIntegrations(integData || []);
      setRecentEmissions(recentData || []);
      setLoading(false);
    }

    fetchData();

    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) return 82;
        return prev + 0.1;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col relative bg-transparent">
      <div className="relative z-10 flex flex-col flex-1">
        <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
          >
            <div>
              <h2 className="text-4xl font-black text-white tracking-tight mb-2">
                Global Operations <span className="text-primary font-normal">Hub</span>
              </h2>
              <p className="text-slate-400 max-w-xl">
                Monitoramento de frota SaaS em tempo real, controle de emissão autônomo e sincronização financeira.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 border border-primary/20 rounded-full px-4 py-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full status-pulse"></span>
                <span className="text-xs font-bold text-primary tracking-wide uppercase">System Status: Optimal</span>
              </div>
              <button className="bg-white text-background-dark font-bold text-sm px-6 py-2.5 rounded-lg hover:bg-primary transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">add</span> New Request
              </button>
            </div>
          </motion.div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <DashboardCard
              title="Air Automations"
              icon={<span className="material-symbols-outlined">bolt</span>}
              accentColor="primary"
              bgIcon={<span className="material-symbols-outlined text-8xl">flight</span>}
            >
              <div className="space-y-4">
                {['AZUL', 'SMILES', 'LATAM'].map(airline => {
                  const integration = integrations.find(i => i.airline.toUpperCase() === airline);
                  const isActive = integration?.status === 'active';
                  return (
                    <ToggleItem
                      key={airline}
                      label={`${airline} Extractor`}
                      sublabel={isActive ? "Active | Monitoring" : "Inactive | Offline"}
                      active={isActive}
                      onToggle={() => { }}
                    />
                  );
                })}
              </div>
              <div className="mt-auto pt-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-2xl font-black text-white">{stats.totalEmissions}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Processed today</p>
                  </div>
                  <div className="text-primary flex items-center gap-1 text-sm font-bold">
                    <span className="material-symbols-outlined text-sm">trending_up</span> 12%
                  </div>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard
              title="Live Issuing"
              icon={<span className="material-symbols-outlined">local_activity</span>}
              accentColor="accent-blue"
              headerExtra={
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-bold text-red-500 tracking-tighter uppercase">Live Feed</span>
                </div>
              }
            >
              <div className="flex-1 custom-scrollbar overflow-y-auto space-y-3 pr-2 max-h-[220px]">
                {recentEmissions.length > 0 ? recentEmissions.map((ext, idx) => (
                  <LiveItem
                    key={ext.id}
                    title={`${ext.airline} | ${ext.locator}`}
                    time={new Date(ext.capture_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    details={`${ext.passenger_name || 'N/A'} • ${ext.miles_used.toLocaleString()} pts`}
                    status={idx % 2 === 0 ? "primary" : "accent-blue"}
                  />
                )) : <div className="text-xs text-slate-500 italic p-4">Aguardando dados...</div>}
              </div>
              <button className="w-full py-2 mt-4 bg-white/5 hover:bg-white/10 transition-colors rounded-lg text-xs font-bold text-slate-300">
                View Complete Queue
              </button>
            </DashboardCard>

            <DashboardCard
              title="Cloud Sync"
              icon={<span className="material-symbols-outlined">sync</span>}
              accentColor="green"
              headerExtra={<span className="material-symbols-outlined text-green-500 animate-spin text-lg" style={{ animationDuration: '4s' }}>refresh</span>}
            >
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle className="text-white/5" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8"></circle>
                    <motion.circle
                      className="text-green-500"
                      cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8"
                      strokeDasharray="364.4"
                      animate={{ strokeDashoffset: 364.4 - (364.4 * syncProgress) / 100 }}
                      transition={{ duration: 0.5 }}
                    ></motion.circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-white">{Math.round(syncProgress)}%</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Synced</span>
                  </div>
                </div>
                <p className="mt-4 text-xs font-medium text-slate-400">Updating Financial Ledger...</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-auto">
                <div className="p-2 rounded-lg bg-white/5 text-center">
                  <p className="text-[10px] text-slate-500 font-bold">RECORDS</p>
                  <p className="text-sm font-bold text-white">45,291</p>
                </div>
                <div className="p-2 rounded-lg bg-white/5 text-center">
                  <p className="text-[10px] text-slate-500 font-bold">LATENCY</p>
                  <p className="text-sm font-bold text-green-400">24ms</p>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard
              title="Financial KPIs"
              icon={<span className="material-symbols-outlined">bar_chart</span>}
              accentColor="primary"
              headerExtra={<div className="px-2 py-0.5 bg-primary/20 rounded text-[10px] font-bold text-primary">MONTHLY</div>}
              className="bg-gradient-to-br from-[#141E26]/50 to-transparent"
            >
              <div className="space-y-6 flex-1 justify-center flex flex-col">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Gross Revenue</p>
                    <p className="text-lg font-black text-white">$142,509.00</p>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary glow-primary"
                      initial={{ width: 0 }}
                      animate={{ width: '75%' }}
                      transition={{ duration: 1, delay: 0.5 }}
                    ></motion.div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Total Miles</p>
                    <p className="text-lg font-black text-white">{(stats.totalMiles / 1000000).toFixed(1)}M pts</p>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-accent-blue glow-primary"
                      initial={{ width: 0 }}
                      animate={{ width: '58%' }}
                      transition={{ duration: 1, delay: 0.7 }}
                    ></motion.div>
                  </div>
                </div>
              </div>
              <div className="h-20 w-full flex items-end justify-between gap-1 mt-4">
                {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.5, delay: 1 + i * 0.1 }}
                    className="w-full bg-primary/20 rounded-t-sm hover:bg-primary transition-all cursor-pointer"
                  ></motion.div>
                ))}
              </div>
            </DashboardCard>
          </div>

          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">hub</span> Global Traffic Matrix
              </h3>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-semibold text-slate-300">Last 24h</button>
                <button className="px-3 py-1 bg-primary/20 border border-primary/30 rounded-lg text-xs font-semibold text-primary">Live</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="lg:col-span-2 glass-panel rounded-2xl h-80 relative overflow-hidden group"
              >
                <div
                  className="absolute inset-0 bg-center bg-cover opacity-60 mix-blend-screen transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: "url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=2066')" }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1117] via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Hubs</span>
                      <span className="text-2xl font-black text-white">42 Nodes</span>
                    </div>
                    <div className="h-10 w-[1px] bg-white/10"></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Response</span>
                      <span className="text-2xl font-black text-primary">0.12s</span>
                    </div>
                  </div>
                </div>

                <div className="absolute top-10 left-1/4 w-3 h-3 bg-primary rounded-full status-pulse"></div>
                <div className="absolute bottom-1/3 right-1/3 w-2 h-2 bg-accent-blue rounded-full status-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-primary rounded-full status-pulse" style={{ animationDelay: '1.2s' }}></div>
              </motion.div>

              <div className="flex flex-col gap-4">
                <SideCard
                  icon="dns"
                  title="Server Load"
                  sub="Regional clustering active"
                  value="24%"
                  status="STABLE"
                  statusColor="text-green-500"
                />
                <SideCard
                  icon="shield"
                  title="Firewall Status"
                  sub="Layer 7 protection ON"
                  value="Active"
                  status="SECURE"
                  statusColor="text-green-500"
                />
                <div className="glass-panel rounded-2xl p-5 flex-1 flex items-center gap-4 border border-primary/20 shadow-xl">
                  <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                    <span className="material-symbols-outlined text-primary text-2xl">auto_awesome</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-none">AI Insights</p>
                    <p className="text-[10px] text-primary/70 mt-1 uppercase tracking-tighter">Recommendation Ready</p>
                  </div>
                  <button className="ml-auto bg-primary text-[#0B1117] text-[10px] font-black px-3 py-1.5 rounded-md hover:brightness-110 transition-all">
                    VIEW
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="mt-auto py-8 px-10 border-t border-white/5 glass-panel text-slate-500 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <span className="text-xs font-bold tracking-widest text-slate-400">GSMVIAGEM PRO v2.4.0</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span className="text-[10px] font-medium">All services operational</span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="text-xs hover:text-white transition-colors">Documentation</a>
            <a href="#" className="text-xs hover:text-white transition-colors">API Keys</a>
            <a href="#" className="text-xs hover:text-white transition-colors">Support</a>
            <div className="flex gap-4 ml-4">
              <span className="material-symbols-outlined cursor-pointer hover:text-primary transition-colors">language</span>
              <span className="material-symbols-outlined cursor-pointer hover:text-primary transition-colors">terminal</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
