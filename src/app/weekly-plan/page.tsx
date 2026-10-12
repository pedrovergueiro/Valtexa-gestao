"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  User,
  Check,
  ChevronRight,
  FileText,
  Lock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface WeeklyPlanItem {
  id: string;
  title: string;
  dayOfWeek?: number | null;
  expectedDelivery?: string | null;
  isPriority: boolean;
  isRolledOver: boolean;
  rolloverReason?: string | null;
  status: string;
  user: { id: string; name: string; title: string; initials?: string };
  task?: { id: string; taskNumber: number; title: string; status: string; dueDate?: string | null } | null;
}

interface WeeklyPlan {
  id: string;
  title: string;
  year: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  status: string;
  strategicFocus?: string | null;
  closureReport?: string | null;
  closedAt?: string | null;
  publishedAt?: string | null;
  items: WeeklyPlanItem[];
}

const DAY_NAMES = ["", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];

export default function WeeklyPlanPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal para criar item na agenda
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    userId: "",
    taskId: "",
    title: "",
    dayOfWeek: "1",
    expectedDelivery: "",
    isPriority: false,
  });

  const [executivesList, setExecutivesList] = useState<Array<{ id: string; name: string; title: string }>>([]);
  const [openTasksList, setOpenTasksList] = useState<Array<{ id: string; taskNumber: number; title: string }>>([]);

  const isCOOUser = user?.roles.includes("COO");

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/weekly-plan");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        if (data.length > 0 && !selectedPlan) {
          setSelectedPlan(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const orgRes = await fetch("/api/org");
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        // Filtrar executivos (COO, CEO, CTO, CPO)
        setExecutivesList(orgData.users || []);
      }
      const tasksRes = await fetch("/api/tasks");
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setOpenTasksList(tasksData || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchPlans();
    loadMetadata();
  }, [user]);

  const handlePublishPlan = async () => {
    if (!selectedPlan) return;
    if (!confirm(`Deseja publicar oficialmente o planejamento da Semana ${selectedPlan.weekNumber}? Os executivos serão notificados.`)) return;

    try {
      const res = await fetch(`/api/weekly-plan/${selectedPlan.id}/publish`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Planejamento publicado com sucesso!");
        fetchPlans();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao publicar");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClosePlan = async () => {
    if (!selectedPlan) return;
    const rollover = confirm("Deseja encerrar a semana e gerar o relatório consolidado de encerramento?");
    if (!rollover) return;

    try {
      const res = await fetch(`/api/weekly-plan/${selectedPlan.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rolloverToNextWeek: false }),
      });
      if (res.ok) {
        const data = await res.json();
        alert("Semana encerrada com sucesso! Relatório gerado.");
        fetchPlans();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao encerrar semana");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !itemForm.userId || !itemForm.title.trim()) return;

    try {
      const res = await fetch(`/api/weekly-plan/${selectedPlan.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemForm),
      });

      if (res.ok) {
        setIsAddItemOpen(false);
        setItemForm({
          userId: "",
          taskId: "",
          title: "",
          dayOfWeek: "1",
          expectedDelivery: "",
          isPriority: false,
        });
        fetchPlans();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao adicionar item");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Carregando Agenda Executiva...</div>;
  }

  // Agrupar itens do plano por executivo
  const executiveGroupedItems: Record<string, WeeklyPlanItem[]> = {};
  if (selectedPlan) {
    for (const item of selectedPlan.items) {
      const uName = item.user.name;
      if (!executiveGroupedItems[uName]) executiveGroupedItems[uName] = [];
      executiveGroupedItems[uName].push(item);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              AGENDA EXECUTIVA
            </span>
            <span className="text-xs text-slate-400">• Governança Semanal dos 4 Sócios</span>
          </div>
          <h1 className="text-lg font-bold text-slate-100">
            {selectedPlan?.title || "Planejamento Semanal"}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Coordenação operacional: COO distribui compromissos e entregas aos pares executivos (CEO, CTO, CPO).
          </p>
        </div>

        {/* Action Buttons for COO */}
        <div className="flex items-center gap-3">
          {isCOOUser && selectedPlan?.status === "EM_ELABORACAO" && (
            <button
              onClick={handlePublishPlan}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publicar Agenda da Semana</span>
            </button>
          )}

          {isCOOUser && (selectedPlan?.status === "PUBLICADA" || selectedPlan?.status === "EM_EXECUCAO") && (
            <button
              onClick={handleClosePlan}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-2 shadow transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Encerrar Semana & Gerar Relatório</span>
            </button>
          )}

          {isCOOUser && selectedPlan?.status !== "ENCERRADA" && (
            <button
              onClick={() => setIsAddItemOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Entrega</span>
            </button>
          )}
        </div>
      </div>

      {/* Plan Status Banner */}
      {selectedPlan && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Estado do Ciclo Semanal:</span>
              <span className="font-semibold text-xs px-2.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                {selectedPlan.status}
              </span>
              <span className="text-xs text-slate-400">
                Período: {new Date(selectedPlan.startDate).toLocaleDateString("pt-BR")} até{" "}
                {new Date(selectedPlan.endDate).toLocaleDateString("pt-BR")}
              </span>
            </div>
            {selectedPlan.strategicFocus && (
              <p className="text-xs text-slate-300">
                <span className="text-slate-400 font-semibold">Foco Estratégico:</span> {selectedPlan.strategicFocus}
              </p>
            )}
          </div>

          <div className="text-right text-xs">
            <span className="text-slate-400 block">Total de Entregas Mapeadas:</span>
            <span className="text-base font-bold text-slate-100">{selectedPlan.items.length} itens</span>
          </div>
        </div>
      )}

      {/* Closure Report Display (se a semana estiver encerrada) */}
      {selectedPlan?.closureReport && (
        <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
            <FileText className="w-4 h-4" />
            <span>Relatório Oficial de Fechamento da Semana</span>
          </div>
          <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-950 p-4 rounded-lg border border-slate-800">
            {selectedPlan.closureReport}
          </div>
        </div>
      )}

      {/* Grid: 4 Sócios Executivos (COO, CEO, CTO, CPO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ name: "Pedro Lucas Vergueiro", title: "COO — Operações Gerais" },
          { name: "Murilo", title: "CEO — Negócios & Estratégia Corporativa" },
          { name: "Gabriel", title: "CTO — Tecnologia, IA & ValTexa Rover V3" },
          { name: "Nicholas", title: "CPO — Produto, UX & Requisitos de Campo" }].map(({ name, title }) => {
          const items = executiveGroupedItems[name] || [];
          const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("");
          const execTitle = title;

          return (
            <div key={name} className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-full">
              {/* Header do Executivo */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/40 rounded-t-xl">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-7 h-7 rounded bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-xs border border-slate-700">
                    {initials}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 text-xs">{name}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{execTitle}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Entregas previstas:</span>
                  <span className="font-bold text-slate-200">{items.length}</span>
                </div>
              </div>

              {/* Items do Executivo */}
              <div className="p-3 flex-1 space-y-2.5 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-6 text-center italic">
                    Nenhuma entrega alocada nesta semana.
                  </p>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border text-xs space-y-1.5 transition-colors ${
                        item.isPriority
                          ? "bg-amber-950/20 border-amber-800/60"
                          : "bg-slate-950/70 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">
                          {item.dayOfWeek ? DAY_NAMES[item.dayOfWeek] : "Durante a semana"}
                        </span>
                        {item.isPriority && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-900 text-amber-300 font-semibold">
                            Prioridade
                          </span>
                        )}
                        {item.isRolledOver && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 font-semibold border border-rose-900">
                            Transferida
                          </span>
                        )}
                      </div>

                      <p className="font-medium text-slate-200 leading-snug">{item.title}</p>

                      {item.expectedDelivery && (
                        <p className="text-[11px] text-slate-400">
                          <span className="text-slate-400">Entrega:</span> {item.expectedDelivery}
                        </p>
                      )}

                      {item.task && (
                        <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
                          <Link
                            href={`/tasks/${item.task.id}`}
                            className="text-emerald-400 hover:underline font-mono"
                          >
                            #{item.task.taskNumber} Tarefa vinculada →
                          </Link>
                          <span className="font-semibold text-slate-300">{item.task.status}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL PARA ADICIONAR ITEM À AGENDA */}
      {isAddItemOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 pb-2 border-b border-slate-800">
              Adicionar Entrega ao Planejamento Semanal
            </h3>
            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Executivo Responsável *</label>
                <select
                  required
                  value={itemForm.userId}
                  onChange={(e) => setItemForm({ ...itemForm, userId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                >
                  <option value="">Selecione o executivo...</option>
                  {executivesList.map((exec) => (
                    <option key={exec.id} value={exec.id}>
                      {exec.name} ({exec.title})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Título da Atividade / Compromisso *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Validação do Plano Técnico do Rover V3..."
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Dia Previsto</label>
                  <select
                    value={itemForm.dayOfWeek}
                    onChange={(e) => setItemForm({ ...itemForm, dayOfWeek: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  >
                    <option value="1">Segunda-feira</option>
                    <option value="2">Terça-feira</option>
                    <option value="3">Quarta-feira</option>
                    <option value="4">Quinta-feira</option>
                    <option value="5">Sexta-feira</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Vincular a Tarefa Existente</label>
                  <select
                    value={itemForm.taskId}
                    onChange={(e) => setItemForm({ ...itemForm, taskId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  >
                    <option value="">Nenhuma (Compromisso avulso)</option>
                    {openTasksList.map((t) => (
                      <option key={t.id} value={t.id}>
                        #{t.taskNumber} {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Entrega Esperada na Semana</label>
                <input
                  type="text"
                  placeholder="Ex: Relatório assinado e cronograma de campo alinhado..."
                  value={itemForm.expectedDelivery}
                  onChange={(e) => setItemForm({ ...itemForm, expectedDelivery: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isPriorityItem"
                  checked={itemForm.isPriority}
                  onChange={(e) => setItemForm({ ...itemForm, isPriority: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-amber-500"
                />
                <label htmlFor="isPriorityItem" className="text-slate-300 cursor-pointer">
                  Destacar como prioridade inegociável da semana
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Adicionar ao Plano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

