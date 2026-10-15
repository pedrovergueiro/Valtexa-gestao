"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileCheck, Calendar, Clock, ArrowRight, CheckCircle2, Inbox } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface ApprovalItem {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  completionCriteria?: string | null;
  priority: string;
  dueDate?: string | null;
  requiresApproval: boolean;
  assignedTo?: { id: string; name: string; title: string; initials?: string | null } | null;
  createdBy: { id: string; name: string; title: string };
  department?: { id: string; name: string; code: string } | null;
  project?: { id: string; name: string; code: string } | null;
  checklistTotal: number;
  checklistDone: number;
  submittedAt: string;
  submittedBy?: { id: string; name: string } | null;
  canApprove: boolean;
}

const PRIORITY_BADGES: Record<string, { label: string; color: string }> = {
  CRITICA: { label: "Crítica", color: "text-rose-400 bg-rose-950/60 border-rose-800" },
  ALTA: { label: "Alta", color: "text-orange-400 bg-orange-950/60 border-orange-800" },
  MEDIA: { label: "Média", color: "text-amber-400 bg-amber-950/60 border-amber-800" },
  BAIXA: { label: "Baixa", color: "text-blue-400 bg-blue-950/60 border-blue-800" },
};

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      const res = await fetch("/api/approvals");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error("Erro ao carregar fila de aprovação:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [user]);

  const handleAction = async (taskId: string, action: "APPROVE" | "REQUEST_CHANGES") => {
    const text = feedback[taskId]?.trim() || "";
    if (action === "REQUEST_CHANGES" && !text) {
      alert("Descreva os ajustes necessários antes de devolver a entrega.");
      return;
    }
    setBusyId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, feedback: text }),
      });
      if (res.ok) {
        // Aprovada ou devolvida, a tarefa sai da fila
        setItems((prev) => prev.filter((i) => i.id !== taskId));
        setFeedback((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
        window.dispatchEvent(new Event("approvals:changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Erro na homologação");
        fetchQueue();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  const now = new Date();
  const mine = items.filter((i) => i.canApprove).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
            FILA DE HOMOLOGAÇÃO
          </span>
          <span className="text-xs text-slate-400">• Entregas submetidas à liderança</span>
        </div>
        <h1 className="text-lg font-bold text-slate-100">Aguardando Aprovação</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Toda entrega submetida para revisão aparece aqui. Ao ser aprovada ou devolvida para ajustes, sai da fila.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-purple-300 text-xs mb-1">
            <span>Na fila</span>
            <FileCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-purple-300">{items.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-emerald-400 text-xs mb-1">
            <span>Cabe a você aprovar</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{mine}</div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Carregando fila de aprovação...</div>
      ) : items.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Inbox className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">Nenhuma entrega aguardando aprovação</h3>
          <p className="text-xs text-slate-400 mt-1">Quando alguém submeter uma tarefa para revisão, ela aparece aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const priorityStyle = PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.MEDIA;
            const isLate = item.dueDate && new Date(item.dueDate) < now;
            return (
              <div key={item.id} className="bg-slate-900 border border-purple-900/50 rounded-xl p-4 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">#{item.taskNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${priorityStyle.color}`}>
                        {priorityStyle.label}
                      </span>
                      {item.department && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {item.department.name}
                        </span>
                      )}
                      {item.project && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700 font-mono">
                          {item.project.code}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/tasks/${item.id}`}
                      className="text-sm font-semibold text-slate-100 hover:text-emerald-400 transition-colors inline-block"
                    >
                      {item.title}
                    </Link>
                    {item.completionCriteria && (
                      <p className="text-xs text-slate-400 line-clamp-2">
                        <span className="text-emerald-400/80 font-medium">Critério de aceitação:</span>{" "}
                        {item.completionCriteria}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-5 text-xs shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Submetida por</span>
                      <span className="font-semibold text-slate-200">{item.submittedBy?.name || "—"}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {new Date(item.submittedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Prazo</span>
                      <span className={`font-semibold flex items-center gap-1 justify-end ${isLate ? "text-rose-400" : "text-slate-300"}`}>
                        <Calendar className="w-3 h-3" />
                        {item.dueDate ? new Date(item.dueDate).toLocaleDateString("pt-BR") : "Sem prazo"}
                      </span>
                    </div>
                    {item.checklistTotal > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Checklist</span>
                        <span className="font-semibold text-slate-200">
                          {item.checklistDone}/{item.checklistTotal}
                        </span>
                      </div>
                    )}
                    <Link
                      href={`/tasks/${item.id}`}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Abrir tarefa"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {item.canApprove ? (
                  <div className="flex flex-col md:flex-row gap-2 pt-3 border-t border-slate-800">
                    <input
                      type="text"
                      placeholder="Feedback (obrigatório para pedir ajustes)..."
                      value={feedback[item.id] || ""}
                      onChange={(e) => setFeedback((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      disabled={busyId === item.id}
                      onClick={() => handleAction(item.id, "APPROVE")}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs"
                    >
                      Aprovar
                    </button>
                    <button
                      disabled={busyId === item.id}
                      onClick={() => handleAction(item.id, "REQUEST_CHANGES")}
                      className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs"
                    >
                      Pedir Ajustes
                    </button>
                  </div>
                ) : (
                  <p className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                    Aguardando aprovação de {item.createdBy.name} ou do COO.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
