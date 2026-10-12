"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Flame,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Layers,
  FolderKanban,
  FileCheck,
  ChevronRight,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAuth } from "@/context/AuthContext";

interface DashboardData {
  summary: {
    totalOpenTasks: number;
    completedTasksCount: number;
    delayedTasksCount: number;
    blockedTasksCount: number;
    reviewTasksCount: number;
    totalTasksAllTime: number;
    onTimeRate: number | null;
    onTimeDenominator: number;
    avgCompletionDays: number | null;
    avgCompletionDenominator: number;
    weeklyPlanCompletionRate: number | null;
    weeklyPlanDenominator: number;
    currentWeeklyPlanTitle: string | null;
  };
  sectorDistribution: Array<{
    id: string;
    name: string;
    code: string;
    color: string;
    total: number;
    open: number;
    completed: number;
    delayed: number;
  }>;
  workloadByUser: Array<{
    id: string;
    name: string;
    title: string;
    initials: string;
    activeTasksCount: number;
    totalEstimatedHours: number;
    delayedTasksCount: number;
  }>;
  priorityDistribution: Array<{
    priority: string;
    label: string;
    count: number;
  }>;
  projects: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    priority: string;
    leadName: string;
    totalTasks: number;
    completedTasks: number;
  }>;
  upcomingMilestones: Array<{
    id: string;
    title: string;
    dueDate: string;
    project: { name: string; code: string };
  }>;
  delayedTasksList: Array<{
    id: string;
    taskNumber: number;
    title: string;
    dueDate: string | null;
    assignedToName: string;
    departmentName: string;
    priority: string;
  }>;
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICA: "#ef4444",
  ALTA: "#f97316",
  MEDIA: "#eab308",
  BAIXA: "#3b82f6",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Consolidando indicadores da ValTexa...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-slate-400">
        Não foi possível carregar os dados executivos.
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner / Strategic Focus */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              PAINEL EXECUTIVO CONSOLIDADO
            </span>
            <span className="text-xs text-slate-400">• ValTexa Autônoma & Visão Agrícola</span>
          </div>
          <h1 className="text-lg font-bold text-slate-100">
            Governança da Semana: {summary.currentWeeklyPlanTitle || "Planejamento Ativo"}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Coordenação operacional: COO orienta o alinhamento de CEO, CTO e CPO com base em métricas reais.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/tasks"
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950"
          >
            <span>+ Nova Tarefa</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/weekly-plan"
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Agenda Executiva</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {/* Total Abertas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Tarefas Abertas</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{summary.totalOpenTasks}</div>
          <p className="text-[10px] text-slate-400 mt-1">de {summary.totalTasksAllTime} no histórico total</p>
        </div>

        {/* Atrasadas */}
        <div className="bg-slate-900 border border-rose-950/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-rose-400 text-xs mb-1">
            <span>Atrasadas</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{summary.delayedTasksCount}</div>
          <p className="text-[10px] text-rose-400/70 mt-1">
            {summary.delayedTasksCount > 0 ? "Requer intervenção" : "Em dia"}
          </p>
        </div>

        {/* Bloqueadas */}
        <div className="bg-slate-900 border border-amber-950/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-amber-400 text-xs mb-1">
            <span>Bloqueadas</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{summary.blockedTasksCount}</div>
          <p className="text-[10px] text-slate-400 mt-1">Dependências externas</p>
        </div>

        {/* Aguardando Revisão */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-blue-400 text-xs mb-1">
            <span>Aguardando Aprovação</span>
            <FileCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{summary.reviewTasksCount}</div>
          <p className="text-[10px] text-slate-400 mt-1">Submetidas à liderança</p>
        </div>

        {/* Conclusão no Prazo (%) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Cumprimento Prazo</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {summary.onTimeRate !== null ? `${summary.onTimeRate}%` : "—"}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {summary.onTimeDenominator > 0 ? `${summary.onTimeDenominator} avaliadas` : "Sem amostras"}
          </p>
        </div>

        {/* Progresso Semanal (%) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Agenda Semanal</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {summary.weeklyPlanCompletionRate !== null ? `${summary.weeklyPlanCompletionRate}%` : "—"}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{summary.weeklyPlanDenominator} itens planejados</p>
        </div>
      </div>

      {/* Delayed Tasks Alert Banner (se houver) */}
      {data.delayedTasksList.length > 0 && (
        <div className="bg-rose-950/20 border border-rose-900/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>Atenção Operacional: {data.delayedTasksList.length} tarefa(s) ultrapassaram a data limite</span>
            </div>
            <Link href="/tasks?status=ATRASADAS" className="text-[11px] text-rose-300 hover:underline">
              Ver todas na lista →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.delayedTasksList.map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="p-2.5 rounded-lg bg-slate-900/90 border border-rose-900/40 hover:border-rose-600 transition-colors block text-xs"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                  <span className="font-mono text-rose-400 font-semibold">#{t.taskNumber}</span>
                  <span className="text-rose-400 font-medium">
                    {t.dueDate ? `Venceu em ${new Date(t.dueDate).toLocaleDateString("pt-BR")}` : ""}
                  </span>
                </div>
                <p className="font-medium text-slate-200 line-clamp-1">{t.title}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>Resp: {t.assignedToName}</span>
                  <span className="text-slate-400">{t.departmentName}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribuição por Setor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Distribuição de Tarefas por Setor
              </h2>
              <p className="text-[11px] text-slate-400">Total de tarefas abertas vs. concluídas por área</p>
            </div>
            <Link href="/departments" className="text-xs text-emerald-400 hover:underline">
              Gerenciar setores →
            </Link>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sectorDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="code" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                />
                <Bar dataKey="open" name="Abertas" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Concluídas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delayed" name="Atrasadas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Prioridades */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
              Distribuição por Prioridade
            </h2>
            <p className="text-[11px] text-slate-400 mb-4">Classificação de esforço e urgência corporativa</p>
            <div className="space-y-3">
              {data.priorityDistribution.map((p) => (
                <div key={p.priority} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PRIORITY_COLORS[p.priority] }}
                    />
                    <span className="text-slate-300">{p.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">{p.count}</span>
                    <span className="text-[10px] text-slate-400">tarefas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 mt-4 text-[11px] text-slate-400">
            <p className="font-semibold text-slate-300 mb-0.5">Princípio ValTexa:</p>
            Tarefas críticas exigem justificativa prévia para evitar inflação artificial de urgências.
          </div>
        </div>
      </div>

      {/* Workload by Executive & Collaborators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carga de Trabalho */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Carga Operacional da Liderança e Equipe
              </h2>
              <p className="text-[11px] text-slate-400">Tarefas ativas simultâneas e estimativa de horas</p>
            </div>
            <Link href="/org" className="text-xs text-emerald-400 hover:underline">
              Ver organograma →
            </Link>
          </div>
          <div className="space-y-2.5">
            {data.workloadByUser.map((u) => (
              <div
                key={u.id}
                className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-xs border border-slate-700">
                    {u.initials}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block">{u.name}</span>
                    <span className="text-[10px] text-slate-400 block">{u.title}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="font-bold text-slate-200 block text-xs">{u.activeTasksCount}</span>
                    <span className="text-[10px] text-slate-400">tarefas ativas</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-200 block text-xs">{u.totalEstimatedHours}h</span>
                    <span className="text-[10px] text-slate-400">esforço est.</span>
                  </div>
                  {u.delayedTasksCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 text-[10px] border border-rose-800 font-semibold">
                      {u.delayedTasksCount} atrasada(s)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projetos Estratégicos Ativos */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Projetos Corporativos e Tecnologia
              </h2>
              <p className="text-[11px] text-slate-400">Progresso dos marcos do Rover V3, SaaS e Validação</p>
            </div>
            <Link href="/projects" className="text-xs text-emerald-400 hover:underline">
              Todos os projetos →
            </Link>
          </div>
          <div className="space-y-3">
            {data.projects.map((proj) => {
              const pct = proj.totalTasks > 0 ? Math.round((proj.completedTasks / proj.totalTasks) * 100) : 0;
              return (
                <div key={proj.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-400 font-bold">{proj.code}</span>
                      <span className="font-semibold text-slate-200">{proj.name}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Líder: {proj.leadName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>
                      {proj.completedTasks} de {proj.totalTasks} tarefas concluídas
                    </span>
                    <span className="font-semibold text-slate-300">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

