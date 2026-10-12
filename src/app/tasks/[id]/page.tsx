"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  Send,
  Plus,
  Calendar,
  Building,
  User,
  History,
  Check,
  X,
  MessageSquare,
  Lock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface TaskDetail {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  businessObjective?: string | null;
  expectedResult?: string | null;
  completionCriteria?: string | null;
  referenceLinks?: string | null;
  requiresApproval: boolean;
  notesRestrictions?: string | null;
  estimatedHours?: number | null;
  businessImpact?: string | null;
  status: string;
  priority: string;
  criticalReason?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  actualStartDate?: string | null;
  completedAt?: string | null;
  createdById: string;
  assignedToId?: string | null;
  createdBy: { id: string; name: string; title: string; email: string };
  assignedTo?: { id: string; name: string; title: string; email: string; initials?: string } | null;
  department?: { id: string; name: string; code: string; color: string } | null;
  project?: { id: string; name: string; code: string } | null;
  checklistItems: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
    completedAt?: string | null;
    completedBy?: { id: string; name: string } | null;
  }>;
  subtasks: Array<{
    id: string;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    dueDate?: string | null;
    estimatedHours?: number | null;
    assignedTo?: { id: string; name: string; title: string } | null;
  }>;
  comments: Array<{
    id: string;
    content: string;
    isBlockerReport: boolean;
    createdAt: string;
    user: { id: string; name: string; title: string; initials?: string };
  }>;
  statusHistory: Array<{
    id: string;
    oldStatus: string;
    newStatus: string;
    reason?: string | null;
    createdAt: string;
    changedBy: { id: string; name: string };
  }>;
  approvals: Array<{
    id: string;
    status: string;
    feedback?: string | null;
    requestedAt: string;
    reviewedAt?: string | null;
    requestedBy: { id: string; name: string };
    reviewerBy?: { id: string; name: string } | null;
  }>;
  predecessorDependencies: Array<{
    predecessor: { id: string; taskNumber: number; title: string; status: string; assignedTo?: { name: string } | null };
  }>;
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const taskId = resolvedParams.id;
  const { user } = useAuth();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; title: string }>>([]);

  // States for interactive inputs
  const [newChecklistText, setNewChecklistText] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [isBlockerReport, setIsBlockerReport] = useState(false);

  // Subtask delegation state
  const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false);
  const [subtaskForm, setSubtaskForm] = useState({
    title: "",
    description: "",
    assignedToId: "",
    dueDate: "",
    estimatedHours: "",
    priority: "MEDIA",
  });

  // Approval review feedback
  const [approvalFeedback, setApprovalFeedback] = useState("");

  const fetchTask = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTeam = async () => {
    try {
      const res = await fetch("/api/org");
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.users || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchTask();
    loadTeam();
  }, [taskId, user]);

  const handleToggleChecklist = async (itemId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, isCompleted: !currentStatus }),
      });
      if (res.ok) {
        fetchTask();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newChecklistText.trim() }),
      });
      if (res.ok) {
        setNewChecklistText("");
        fetchTask();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (targetStatus: string, reason?: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, reason }),
      });
      if (res.ok) {
        fetchTask();
      } else {
        const err = await res.json();
        alert(err.error || "Não foi possível alterar o status");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprovalAction = async (action: "APPROVE" | "REQUEST_CHANGES") => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, feedback: approvalFeedback }),
      });
      if (res.ok) {
        setApprovalFeedback("");
        fetchTask();
      } else {
        const err = await res.json();
        alert(err.error || "Erro na homologação");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskForm.title.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subtaskForm),
      });
      if (res.ok) {
        setIsSubtaskModalOpen(false);
        setSubtaskForm({
          title: "",
          description: "",
          assignedToId: "",
          dueDate: "",
          estimatedHours: "",
          priority: "MEDIA",
        });
        fetchTask();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao delegar subtarefa");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newCommentText, isBlockerReport }),
      });
      if (res.ok) {
        setNewCommentText("");
        setIsBlockerReport(false);
        fetchTask();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Carregando detalhes da tarefa...</div>;
  }

  if (!task) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Tarefa não encontrada. <Link href="/tasks" className="text-emerald-400 underline">Voltar para a lista</Link>
      </div>
    );
  }

  const isCOOUser = user?.roles.includes("COO");
  const isCreator = task.createdById === user?.id;
  const isAssigned = task.assignedToId === user?.id;
  const canApprove = isCOOUser || isCreator;

  return (
    <div className="space-y-6">
      {/* Top Back & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/tasks"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-emerald-400">#{task.taskNumber}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {task.department?.name || "Geral"}
              </span>
              {task.project && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700 font-mono">
                  {task.project.code}
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold text-slate-100 mt-0.5">{task.title}</h1>
          </div>
        </div>

        {/* Quick Action Status Bar */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl text-xs">
          <span className="text-[11px] text-slate-400 px-2">Estado Atual:</span>
          <span className="font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
            {task.status}
          </span>
          {task.status !== "EM_ANDAMENTO" && (
            <button
              onClick={() => handleStatusChange("EM_ANDAMENTO", "Iniciado pelo executor")}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
            >
              Iniciar
            </button>
          )}
          {task.status !== "BLOQUEADA" && (
            <button
              onClick={() => {
                const motivo = prompt("Informe o motivo do bloqueio:");
                if (motivo) handleStatusChange("BLOQUEADA", motivo);
              }}
              className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-medium border border-rose-900 transition-colors"
            >
              Bloquear
            </button>
          )}
          {task.status !== "AGUARDANDO_REVISAO" && task.status !== "CONCLUIDA" && (
            <button
              onClick={() => handleStatusChange("AGUARDANDO_REVISAO", "Submetido para homologação da liderança")}
              className="px-2.5 py-1 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-medium border border-purple-800 transition-colors"
            >
              Submeter Revisão
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Details & Right Hierarchy/Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Core 20 Attributes & Execution */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Descrição & Objetivos */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Descrição Completa
              </h2>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
              <div>
                <h3 className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Objetivo Empresarial</h3>
                <p className="text-xs text-slate-300">{task.businessObjective || "Não informado."}</p>
              </div>
              <div>
                <h3 className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Resultado Esperado</h3>
                <p className="text-xs text-slate-300">{task.expectedResult || "Não informado."}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80">
              <h3 className="text-[11px] font-semibold text-emerald-400 uppercase mb-1 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5" />
                Critério Verificável de Conclusão (Critério de Aceitação)
              </h3>
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-200">
                {task.completionCriteria || "Critério formal não especificado."}
              </div>
            </div>
          </div>

          {/* Section: Checklist Interativo */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Checklist de Execução
                </h2>
                <p className="text-[11px] text-slate-400">
                  {task.checklistItems.filter((i) => i.isCompleted).length} de {task.checklistItems.length} concluídos
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {task.checklistItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleChecklist(item.id, item.isCompleted)}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    item.isCompleted
                      ? "bg-emerald-950/20 border-emerald-900/40 text-slate-300"
                      : "bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        item.isCompleted
                          ? "bg-emerald-500 border-emerald-400 text-slate-950"
                          : "border-slate-600 bg-slate-900"
                      }`}
                    >
                      {item.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className={item.isCompleted ? "line-through text-slate-400" : ""}>{item.title}</span>
                  </div>
                  {item.isCompleted && item.completedBy && (
                    <span className="text-[10px] text-emerald-400 font-mono">
                      Por: {item.completedBy.name}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Input to add checklist item */}
            <form onSubmit={handleAddChecklist} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="+ Adicionar item ao checklist..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Adicionar
              </button>
            </form>
          </div>

          {/* Section: Delegação Hierárquica & Subtarefas */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Subtarefas & Delegação à Equipe
                </h2>
                <p className="text-[11px] text-slate-400">
                  O responsável divide o trabalho e atribui subtarefas aos seus liderados
                </p>
              </div>
              <button
                onClick={() => setIsSubtaskModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Delegar Subtarefa</span>
              </button>
            </div>

            {task.subtasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center bg-slate-950 rounded-lg border border-slate-800">
                Nenhuma subtarefa delegada ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {task.subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 block">{sub.title}</span>
                      {sub.description && <span className="text-[11px] text-slate-400 block">{sub.description}</span>}
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      {sub.estimatedHours && (
                        <span className="text-[10px] text-slate-400 font-mono">{sub.estimatedHours}h est.</span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {sub.assignedTo?.name || "Não atribuído"}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-400">{sub.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Comentários & Relato de Impedimentos */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Comentários e Relato de Impedimentos
            </h2>

            <form onSubmit={handleAddComment} className="space-y-2">
              <textarea
                rows={2}
                placeholder="Registrar atualização, observação técnica ou impedimento..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-rose-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBlockerReport}
                    onChange={(e) => setIsBlockerReport(e.target.checked)}
                    className="rounded bg-slate-950 border-rose-900 text-rose-500 focus:ring-0"
                  />
                  <span>Marcar como Impedimento / Bloqueio Operacional</span>
                </label>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publicar</span>
                </button>
              </div>
            </form>

            <div className="space-y-2.5 pt-2">
              {task.comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-3 rounded-lg border text-xs ${
                    comment.isBlockerReport
                      ? "bg-rose-950/20 border-rose-900/60"
                      : "bg-slate-950 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold text-[11px] mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-200">{comment.user.name}</span>
                      <span className="text-slate-400">({comment.user.title})</span>
                      {comment.isBlockerReport && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-900 text-rose-200 text-[10px]">
                          BLOQUEIO
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(comment.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Governance, Approvals, Timeline & Dependencies */}
        <div className="space-y-6">
          {/* Governance Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3.5 text-xs">
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-800">
              Governança e Responsabilidades
            </h2>

            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Responsável Principal</span>
              <span className="font-semibold text-slate-200 block text-xs mt-0.5">
                {task.assignedTo?.name || "Não atribuído"}
              </span>
              <span className="text-[10px] text-slate-400 block">{task.assignedTo?.title}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Criado por</span>
              <span className="font-semibold text-slate-200 block text-xs mt-0.5">{task.createdBy.name}</span>
              <span className="text-[10px] text-slate-400 block">{task.createdBy.title}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Data de Início</span>
                <span className="font-semibold text-slate-200 block">
                  {task.startDate ? new Date(task.startDate).toLocaleDateString("pt-BR") : "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Prazo Final</span>
                <span className="font-semibold text-slate-200 block">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : "—"}
                </span>
              </div>
            </div>

            {task.estimatedHours && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Esforço Estimado</span>
                <span className="font-semibold text-slate-200">{task.estimatedHours} horas</span>
              </div>
            )}
          </div>

          {/* Homologação / Aprovação de Entrega (Se exigida) */}
          {task.requiresApproval && (
            <div className="bg-purple-950/20 border border-purple-900/60 rounded-xl p-5 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-purple-300 font-semibold">
                <FileCheck className="w-4 h-4" />
                <span>Fluxo de Homologação Executiva</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Esta entrega requer revisão e aceite formal do COO ou do criador da tarefa.
              </p>

              {canApprove && (
                <div className="space-y-2 pt-2">
                  <textarea
                    rows={2}
                    placeholder="Feedback ou observações sobre a entrega..."
                    value={approvalFeedback}
                    onChange={(e) => setApprovalFeedback(e.target.value)}
                    className="w-full bg-slate-950 border border-purple-900/80 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprovalAction("APPROVE")}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                    >
                      Aprovar Entrega
                    </button>
                    <button
                      onClick={() => handleApprovalAction("REQUEST_CHANGES")}
                      className="flex-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs"
                    >
                      Pedir Ajustes
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Histórico de Alterações de Status (Audit Trail) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-200 pb-2 border-b border-slate-800">
              <History className="w-4 h-4 text-emerald-400" />
              <span>Histórico de Mudanças</span>
            </div>
            <div className="space-y-3">
              {task.statusHistory.map((h) => (
                <div key={h.id} className="text-[11px] space-y-0.5 border-l-2 border-slate-700 pl-2.5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>{h.changedBy.name}</span>
                    <span className="text-[10px]">{new Date(h.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <p className="text-slate-200 font-medium">
                    Alterou de <span className="text-slate-400">{h.oldStatus}</span> para{" "}
                    <span className="text-emerald-400">{h.newStatus}</span>
                  </p>
                  {h.reason && <p className="text-slate-400 italic text-[10px]">"{h.reason}"</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE DELEGAÇÃO DE SUBTAREFA */}
      {isSubtaskModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">Delegar Subtarefa para Equipe</h3>
              <button onClick={() => setIsSubtaskModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSubtask} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Título da Subtarefa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mapeamento de cenários de poeira alta e sol..."
                  value={subtaskForm.title}
                  onChange={(e) => setSubtaskForm({ ...subtaskForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Responsável Delegado</label>
                <select
                  value={subtaskForm.assignedToId}
                  onChange={(e) => setSubtaskForm({ ...subtaskForm, assignedToId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                >
                  <option value="">Selecione o membro da equipe...</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.title})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Prazo</label>
                  <input
                    type="date"
                    value={subtaskForm.dueDate}
                    onChange={(e) => setSubtaskForm({ ...subtaskForm, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Horas Estimadas</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ex: 8"
                    value={subtaskForm.estimatedHours}
                    onChange={(e) => setSubtaskForm({ ...subtaskForm, estimatedHours: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSubtaskModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Atribuir Subtarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

