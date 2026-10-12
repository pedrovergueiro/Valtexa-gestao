"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  Clock,
  User,
  Building,
  CheckCircle2,
  FileCheck,
  ShieldAlert,
  X,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface TaskItem {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  businessObjective?: string | null;
  status: string;
  priority: string;
  criticalReason?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  requiresApproval: boolean;
  estimatedHours?: number | null;
  assignedTo?: { id: string; name: string; title: string; initials?: string } | null;
  createdBy: { id: string; name: string; title: string };
  department?: { id: string; name: string; code: string; color: string } | null;
  project?: { id: string; name: string; code: string } | null;
  checklistItems: Array<{ id: string; title: string; isCompleted: boolean }>;
  subtasks: Array<{ id: string; title: string; status: string }>;
  predecessorDependencies: Array<{ predecessor: { id: string; taskNumber: number; title: string; status: string } }>;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  RASCUNHO: { label: "Rascunho", bg: "bg-slate-800", text: "text-slate-300", border: "border-slate-700" },
  PLANEJADA: { label: "Planejada", bg: "bg-slate-800/80", text: "text-slate-300", border: "border-slate-700" },
  AGUARDANDO_INICIO: { label: "Aguardando Início", bg: "bg-amber-950/40", text: "text-amber-400", border: "border-amber-800" },
  EM_ANDAMENTO: { label: "Em Andamento", bg: "bg-sky-950/50", text: "text-sky-400", border: "border-sky-800" },
  BLOQUEADA: { label: "Bloqueada", bg: "bg-rose-950/50", text: "text-rose-400", border: "border-rose-800" },
  AGUARDANDO_REVISAO: { label: "Aguardando Revisão", bg: "bg-purple-950/50", text: "text-purple-400", border: "border-purple-800" },
  AJUSTES_SOLICITADOS: { label: "Ajustes Solicitados", bg: "bg-amber-950/50", text: "text-amber-400", border: "border-amber-800" },
  CONCLUIDA: { label: "Concluída", bg: "bg-emerald-950/50", text: "text-emerald-400", border: "border-emerald-800" },
  CANCELADA: { label: "Cancelada", bg: "bg-slate-900", text: "text-slate-500", border: "border-slate-800" },
};

const PRIORITY_BADGES: Record<string, { label: string; color: string }> = {
  CRITICA: { label: "Crítica", color: "text-rose-400 bg-rose-950/60 border-rose-800" },
  ALTA: { label: "Alta", color: "text-orange-400 bg-orange-950/60 border-orange-800" },
  MEDIA: { label: "Média", color: "text-amber-400 bg-amber-950/60 border-amber-800" },
  BAIXA: { label: "Baixa", color: "text-blue-400 bg-blue-950/60 border-blue-800" },
};

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Modal de Criação (20 Atributos Corporativos)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [usersList, setUsersList] = useState<Array<{ id: string; name: string; title: string }>>([]);
  const [departmentsList, setDepartmentsList] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [projectsList, setProjectsList] = useState<Array<{ id: string; name: string; code: string }>>([]);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    businessObjective: "",
    expectedResult: "",
    assignedToId: "",
    departmentId: "",
    projectId: "",
    startDate: "",
    dueDate: "",
    priority: "MEDIA",
    criticalReason: "",
    completionCriteria: "",
    referenceLinks: "",
    requiresApproval: true,
    notesRestrictions: "",
    estimatedHours: "",
    businessImpact: "",
    checklist: [""],
  });

  const fetchTasks = async () => {
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "ALL") query.set("status", statusFilter);
      if (priorityFilter !== "ALL") query.set("priority", priorityFilter);
      if (search) query.set("search", search);

      const res = await fetch(`/api/tasks?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Erro ao buscar tarefas:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const orgRes = await fetch("/api/org");
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setUsersList(orgData.users || []);
        setDepartmentsList(orgData.departments || []);
      }
      const projRes = await fetch("/api/projects");
      if (projRes.ok) {
        const projData = await projRes.json();
        setProjectsList(projData || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchTasks();
    loadMetadata();
  }, [statusFilter, priorityFilter, search, user]);

  const handleAddChecklistInput = () => {
    setFormData((prev) => ({ ...prev, checklist: [...prev.checklist, ""] }));
  };

  const handleChecklistChange = (index: number, val: string) => {
    const updated = [...formData.checklist];
    updated[index] = val;
    setFormData((prev) => ({ ...prev, checklist: updated }));
  };

  const handleRemoveChecklistInput = (index: number) => {
    const updated = formData.checklist.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, checklist: updated.length ? updated : [""] }));
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      alert("Título e descrição completa são obrigatórios.");
      return;
    }

    if (formData.priority === "CRITICA" && !formData.criticalReason) {
      alert("Tarefas Críticas exigem justificativa obrigatória.");
      return;
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          checklist: formData.checklist.filter((item) => item.trim().length > 0),
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        // Reset form
        setFormData({
          title: "",
          description: "",
          businessObjective: "",
          expectedResult: "",
          assignedToId: "",
          departmentId: "",
          projectId: "",
          startDate: "",
          dueDate: "",
          priority: "MEDIA",
          criticalReason: "",
          completionCriteria: "",
          referenceLinks: "",
          requiresApproval: true,
          notesRestrictions: "",
          estimatedHours: "",
          businessImpact: "",
          checklist: [""],
        });
        fetchTasks();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao salvar tarefa");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar dados da tarefa");
    }
  };

  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              MÓDULO CENTRAL
            </span>
            <span className="text-xs text-slate-400">• Gestão Hierárquica e Operacional</span>
          </div>
          <h1 className="text-lg font-bold text-slate-100">Tarefas Corporativas</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Toda tarefa possui responsável, objetivo empresarial, setor, prazo e critérios verificáveis de aceitação.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-950"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Nova Tarefa</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por título, objetivo ou critérios de conclusão..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Status and Priority Dropdowns */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Todos os estados</option>
            <option value="PLANEJADA">Planejada</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="BLOQUEADA">Bloqueada</option>
            <option value="AGUARDANDO_REVISAO">Aguardando Revisão</option>
            <option value="AJUSTES_SOLICITADOS">Ajustes Solicitados</option>
            <option value="CONCLUIDA">Concluída</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Todas as prioridades</option>
            <option value="CRITICA">Crítica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Carregando tarefas...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <CheckSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">Nenhuma tarefa encontrada</h3>
          <p className="text-xs text-slate-400 mt-1">Ajuste os filtros ou cadastre uma nova atividade corporativa.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isDelayed =
              task.dueDate &&
              new Date(task.dueDate) < now &&
              task.status !== "CONCLUIDA" &&
              task.status !== "CANCELADA";

            const completedChecklist = task.checklistItems.filter((i) => i.isCompleted).length;
            const totalChecklist = task.checklistItems.length;
            const statusStyle = STATUS_CONFIG[task.status] || STATUS_CONFIG.PLANEJADA;
            const priorityStyle = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.MEDIA;

            return (
              <div
                key={task.id}
                className={`bg-slate-900 border rounded-xl p-4 transition-all hover:border-slate-700 ${
                  isDelayed ? "border-rose-900/60 bg-rose-950/10" : "border-slate-800"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex-1 space-y-1.5">
                    {/* Top Meta: Number, Priority, Status, Sector, Project */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">#{task.taskNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${priorityStyle.color}`}>
                        {priorityStyle.label}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                        {statusStyle.label}
                      </span>
                      {task.department && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {task.department.name}
                        </span>
                      )}
                      {task.project && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700 font-mono">
                          {task.project.code}
                        </span>
                      )}
                      {task.requiresApproval && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
                          <FileCheck className="w-3 h-3" /> Requer Homologação
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <Link
                      href={`/tasks/${task.id}`}
                      className="text-sm font-semibold text-slate-100 hover:text-emerald-400 transition-colors inline-block"
                    >
                      {task.title}
                    </Link>

                    {/* Business Objective */}
                    {task.businessObjective && (
                      <p className="text-xs text-slate-400 line-clamp-1">
                        <span className="text-slate-400 font-medium">Objetivo:</span> {task.businessObjective}
                      </p>
                    )}

                    {/* Critical reason highlight */}
                    {task.priority === "CRITICA" && task.criticalReason && (
                      <p className="text-[11px] text-rose-300/80 bg-rose-950/30 px-2 py-1 rounded border border-rose-900/40">
                        <span className="font-semibold text-rose-400">Justificativa Crítica:</span> {task.criticalReason}
                      </p>
                    )}
                  </div>

                  {/* Right Meta: Assignee, Due date, Checklist, Action */}
                  <div className="flex items-center gap-6 self-end lg:self-center">
                    {/* Checklist Counter */}
                    {totalChecklist > 0 && (
                      <div className="text-right">
                        <span className="text-[11px] font-medium text-slate-300 block">
                          {completedChecklist}/{totalChecklist} itens
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden mt-0.5">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.round((completedChecklist / totalChecklist) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Subtasks Count */}
                    {task.subtasks.length > 0 && (
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">Subtarefas</span>
                        <span className="text-xs font-semibold text-slate-200">{task.subtasks.length} delegadas</span>
                      </div>
                    )}

                    {/* Due Date */}
                    <div className="text-right min-w-[90px]">
                      <span className="text-[10px] text-slate-400 block">Prazo Final</span>
                      <span className={`text-xs font-semibold flex items-center gap-1 justify-end ${isDelayed ? "text-rose-400" : "text-slate-300"}`}>
                        <Calendar className="w-3 h-3" />
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : "Sem prazo"}
                      </span>
                    </div>

                    {/* Assignee */}
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className="w-7 h-7 rounded bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-xs border border-slate-700">
                        {task.assignedTo?.initials || task.assignedTo?.name?.[0] || "?"}
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-semibold text-slate-200 block truncate max-w-[100px]">
                          {task.assignedTo?.name || "Não atribuído"}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[100px]">
                          {task.assignedTo?.title || "Sem cargo"}
                        </span>
                      </div>
                    </div>

                    {/* Open Button */}
                    <Link
                      href={`/tasks/${task.id}`}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Ver detalhes da tarefa"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO COMPLETO (20 ATRIBUTOS CORPORATIVOS) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-100">Criar Nova Tarefa Corporativa</h2>
                <p className="text-xs text-slate-400">Preencha os atributos exigidos para governança e execução.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTask} className="space-y-4 text-xs">
              {/* 1. Título & 11. Prioridade */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <label className="font-semibold text-slate-300">1. Título da Tarefa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Preparar plano de validação do ValTexa Rover V3"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">11. Prioridade</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CRITICA">Crítica (Exige justificativa)</option>
                    <option value="ALTA">Alta</option>
                    <option value="MEDIA">Média</option>
                    <option value="BAIXA">Baixa</option>
                  </select>
                </div>
              </div>

              {/* Justificativa Crítica se CRITICA */}
              {formData.priority === "CRITICA" && (
                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/60 space-y-1">
                  <label className="font-semibold text-rose-400">Justificativa da Prioridade Crítica *</label>
                  <input
                    type="text"
                    required
                    placeholder="Por que esta tarefa é um ponto único de falha ou urgência inegociável?"
                    value={formData.criticalReason}
                    onChange={(e) => setFormData({ ...formData, criticalReason: e.target.value })}
                    className="w-full bg-slate-950 border border-rose-900 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              {/* 2. Descrição Completa */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">2. Descrição Completa e Contexto *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detalhamento operacional completo, escopo, requisitos e diretrizes técnicas..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 3. Objetivo Empresarial & 4. Resultado Esperado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">3. Objetivo Empresarial</label>
                  <input
                    type="text"
                    placeholder="Ex: Definir condições para validação do protótipo em lavoura..."
                    value={formData.businessObjective}
                    onChange={(e) => setFormData({ ...formData, businessObjective: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">4. Resultado Esperado</label>
                  <input
                    type="text"
                    placeholder="Ex: Relatório documentado com cronograma e matriz de risco..."
                    value={formData.expectedResult}
                    onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 5. Responsável, 6. Setor & 12. Projeto Relacionado */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">5. Responsável Principal</label>
                  <select
                    value={formData.assignedToId}
                    onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Selecione o responsável...</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.title})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">6. Setor Responsável</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Selecione o setor...</option>
                    {departmentsList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">12. Projeto Relacionado</label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Nenhum (Atividade isolada)</option>
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 9. Data Início, 10. Prazo Final & 19. Horas Estimadas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">9. Data de Início</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">10. Prazo Final (Due Date)</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">19. Tempo Estimado (Horas)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ex: 24"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 14. Checklist de Execução */}
              <div className="space-y-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-300">14. Checklist Detalhado de Execução</label>
                  <button
                    type="button"
                    onClick={handleAddChecklistInput}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    + Adicionar Item
                  </button>
                </div>
                {formData.checklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-[11px] w-5 text-right">{idx + 1}.</span>
                    <input
                      type="text"
                      placeholder={`Item de checklist ${idx + 1}...`}
                      value={item}
                      onChange={(e) => handleChecklistChange(idx, e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                    {formData.checklist.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistInput(idx)}
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 15. Critérios de Conclusão & 17. Aprovação */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <label className="font-semibold text-slate-300">15. Critério Verificável de Conclusão</label>
                  <input
                    type="text"
                    placeholder="O que comprova que a tarefa foi cumprida objetivamente?"
                    value={formData.completionCriteria}
                    onChange={(e) => setFormData({ ...formData, completionCriteria: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="requiresApproval"
                    checked={formData.requiresApproval}
                    onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 w-4 h-4"
                  />
                  <label htmlFor="requiresApproval" className="text-slate-300 cursor-pointer">
                    17. Exige Aprovação Formal
                  </label>
                </div>
              </div>

              {/* 18. Observações/Restrições & 20. Impacto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">18. Observações e Restrições</label>
                  <input
                    type="text"
                    placeholder="Ex: Depende de condições climáticas sem chuva..."
                    value={formData.notesRestrictions}
                    onChange={(e) => setFormData({ ...formData, notesRestrictions: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">20. Impacto Esperado na Empresa</label>
                  <input
                    type="text"
                    placeholder="Ex: Permite comprovar autonomia para investidores Seed..."
                    value={formData.businessImpact}
                    onChange={(e) => setFormData({ ...formData, businessImpact: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors shadow-lg shadow-emerald-950"
                >
                  Salvar Tarefa no Sistema
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

