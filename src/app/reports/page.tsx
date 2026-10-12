"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface TaskReportItem {
  id: string;
  taskNumber: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedTo?: { name: string } | null;
  department?: { name: string; code: string } | null;
  estimatedHours?: number | null;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskReportItem[]>([]);
  const [reportType, setReportType] = useState<"ATRASOS" | "SETOR" | "PLANEJAMENTO_EXECUCAO">("ATRASOS");
  const [loading, setLoading] = useState(true);

  const fetchReportData = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [user]);

  const now = new Date();

  // Filtragem de dados conforme o tipo de relatório
  const delayedTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
  );

  const completedTasks = tasks.filter((t) => t.status === "CONCLUIDA");

  const exportToCSV = () => {
    let rows: string[][] = [];
    let headers: string[] = [];

    if (reportType === "ATRASOS") {
      headers = ["Numero", "Titulo", "Status", "Prioridade", "Responsavel", "Setor", "Prazo_Final"];
      rows = delayedTasks.map((t) => [
        `#${t.taskNumber}`,
        `"${t.title.replace(/"/g, '""')}"`,
        t.status,
        t.priority,
        t.assignedTo?.name || "Nao atribuido",
        t.department?.name || "Sem setor",
        t.dueDate ? new Date(t.dueDate).toLocaleDateString("pt-BR") : "",
      ]);
    } else {
      headers = ["Numero", "Titulo", "Status", "Prioridade", "Responsavel", "Setor", "Horas_Estimadas"];
      rows = tasks.map((t) => [
        `#${t.taskNumber}`,
        `"${t.title.replace(/"/g, '""')}"`,
        t.status,
        t.priority,
        t.assignedTo?.name || "Nao atribuido",
        t.department?.name || "Sem setor",
        t.estimatedHours ? String(t.estimatedHours) : "0",
      ]);
    }

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `valtexa_relatorio_${reportType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              INTELIGÊNCIA & COMPLIANCE
            </span>
            <span className="text-xs text-slate-400">• Auditoria de Execução da ValTexa</span>
          </div>
          <h1 className="text-lg font-bold text-slate-100">Central de Relatórios Corporativos</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Geração de relatórios auditáveis com definições explícitas de métricas e exportação em CSV / impressão.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={printReport}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
        <span className="text-xs text-slate-400 font-medium">Modelo do Relatório:</span>
        <button
          onClick={() => setReportType("ATRASOS")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            reportType === "ATRASOS"
              ? "bg-rose-950/60 border-rose-600 text-rose-300"
              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          Relatório de Atrasos e Riscos ({delayedTasks.length})
        </button>
        <button
          onClick={() => setReportType("SETOR")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            reportType === "SETOR"
              ? "bg-emerald-950/60 border-emerald-600 text-emerald-300"
              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          Relatório Operacional Completo ({tasks.length})
        </button>
      </div>

      {/* Generated Report Content Box (Printable) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100">
              {reportType === "ATRASOS"
                ? "Relatório Oficial de Tarefas Atrasadas e Riscos de Cronograma"
                : "Relatório Consolidado de Execução e Produtividade Setorial"}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Emitido em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")} por{" "}
              {user?.name} ({user?.title})
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
            ValTexa ERP Intelligence
          </span>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Nº</th>
                <th className="py-2.5 px-3">Título da Tarefa</th>
                <th className="py-2.5 px-3">Setor</th>
                <th className="py-2.5 px-3">Responsável</th>
                <th className="py-2.5 px-3">Prazo</th>
                <th className="py-2.5 px-3 text-center">Prioridade</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(reportType === "ATRASOS" ? delayedTasks : tasks).map((task) => (
                <tr key={task.id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">#{task.taskNumber}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-200">{task.title}</td>
                  <td className="py-2.5 px-3 text-slate-400">{task.department?.name || "Geral"}</td>
                  <td className="py-2.5 px-3 text-slate-300">{task.assignedTo?.name || "Não atribuído"}</td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-200">{task.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

