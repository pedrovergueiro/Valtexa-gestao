"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  UsersRound,
  Plus,
  Calendar,
  Clock,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Send,
  X,
  Layers,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface MeetingItem {
  id: string;
  title: string;
  meetingType: string;
  objective: string;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  locationOrUrl?: string | null;
  status: string;
  minutesText?: string | null;
  organizer: { id: string; name: string; title: string };
  participants: Array<{ user: { id: string; name: string; title: string; initials?: string } }>;
  agendaItems: Array<{ id: string; position: number; title: string; speaker?: string | null; description?: string | null; durationMin?: number | null }>;
  decisions: Array<{
    id: string;
    description: string;
    category: string;
    status: string;
    responsibleUser?: { id: string; name: string } | null;
    resultingTasks: Array<{ id: string; taskNumber: number; title: string }>;
  }>;
}

export default function MeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal Agendamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [usersList, setUsersList] = useState<Array<{ id: string; name: string; title: string }>>([]);
  const [form, setForm] = useState({
    title: "",
    meetingType: "LIDERANCA_SEMANAL",
    objective: "",
    scheduledStart: "",
    durationMinutes: "60",
    locationOrUrl: "Sala de Governança / Google Meet",
    autoGenerateSmartAgenda: true,
  });

  // Modal Registro de Decisão
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionForm, setDecisionForm] = useState({
    description: "",
    rationale: "",
    category: "OPERACIONAL",
    responsibleUserId: "",
    dueDate: "",
  });

  // Ata de Reunião
  const [minutesText, setMinutesText] = useState("");

  const fetchMeetings = async () => {
    try {
      const res = await fetch("/api/meetings");
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
        if (data.length > 0 && !selectedMeeting) {
          setSelectedMeeting(data[0]);
          setMinutesText(data[0].minutesText || "");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/org");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchMeetings();
    loadUsers();
  }, [user]);

  const handleSelectMeeting = (m: MeetingItem) => {
    setSelectedMeeting(m);
    setMinutesText(m.minutesText || "");
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.objective || !form.scheduledStart) return;

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          participantUserIds: usersList.filter((u) => ["COO", "CEO", "CTO", "CPO"].includes(u.title.split(" ")[0])).map((u) => u.id),
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchMeetings();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao agendar reunião");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveMinutes = async () => {
    if (!selectedMeeting) return;
    try {
      const res = await fetch(`/api/meetings/${selectedMeeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutesText, status: "REALIZADA" }),
      });
      if (res.ok) {
        alert("Ata salva e reunião marcada como realizada!");
        fetchMeetings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting || !decisionForm.description.trim()) return;

    try {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...decisionForm,
          meetingId: selectedMeeting.id,
        }),
      });

      if (res.ok) {
        setIsDecisionModalOpen(false);
        setDecisionForm({
          description: "",
          rationale: "",
          category: "OPERACIONAL",
          responsibleUserId: "",
          dueDate: "",
        });
        fetchMeetings();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao registrar decisão");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertToTask = async (decisionId: string) => {
    try {
      const res = await fetch(`/api/decisions/${decisionId}/convert-to-task`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Decisão convertida com sucesso na Tarefa #${data.task.taskNumber}!`);
        fetchMeetings();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao converter decisão");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Carregando Central de Reuniões...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              GOVERNANÇA & ALINHAMENTO
            </span>
            <span className="text-xs text-slate-400">• Ritos Semanais da Liderança</span>
          </div>
          <h1 className="text-lg font-bold text-slate-100">Central de Reuniões & Atas Executivas</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Pautas geradas a partir de dados reais do sistema; deliberações convertidas em tarefas com 1 clique.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Reunião</span>
        </button>
      </div>

      {/* Main Layout: Left Meetings List & Right Active Meeting Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Reuniões List */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Histórico de Reuniões</h2>
          {meetings.map((m) => {
            const isSelected = selectedMeeting?.id === m.id;
            return (
              <div
                key={m.id}
                onClick={() => handleSelectMeeting(m)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-slate-900 border-emerald-500/70 shadow-lg"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-semibold text-emerald-400">{m.meetingType}</span>
                  <span className="text-slate-400">
                    {new Date(m.scheduledStart).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-100 text-xs mb-1 line-clamp-1">{m.title}</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2">{m.objective}</p>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{m.participants.length} participantes</span>
                  <span>{m.decisions.length} decisões</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Meeting Agenda, Minutes and Decisions */}
        {selectedMeeting && (
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {selectedMeeting.status}
                </span>
                <span className="text-xs text-slate-400">
                  Organizador: <span className="text-slate-200 font-semibold">{selectedMeeting.organizer.name}</span>
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-100">{selectedMeeting.title}</h2>
              <p className="text-xs text-slate-300">{selectedMeeting.objective}</p>

              {/* Participants pills */}
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] text-slate-400 font-medium">Participantes:</span>
                {selectedMeeting.participants.map((p) => (
                  <span
                    key={p.user.id}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    {p.user.name} ({p.user.title.split(" ")[0]})
                  </span>
                ))}
              </div>
            </div>

            {/* Pauta da Reunião (Smart Agenda) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Pauta de Alinhamento Baseada em Dados Reais</span>
              </div>
              <div className="space-y-2.5">
                {selectedMeeting.agendaItems.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                    <div className="flex items-center justify-between font-semibold mb-0.5">
                      <span className="text-slate-200">
                        {item.position}. {item.title}
                      </span>
                      {item.durationMin && (
                        <span className="text-[10px] text-slate-400 font-mono">{item.durationMin} min</span>
                      )}
                    </div>
                    {item.description && <p className="text-[11px] text-slate-400">{item.description}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Ata da Reunião */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-slate-200 uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Ata da Reunião e Discussões</span>
                </div>
                <button
                  onClick={handleSaveMinutes}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                >
                  Salvar Ata
                </button>
              </div>
              <textarea
                rows={4}
                placeholder="Registre os pontos discutidos, alinhamentos da liderança e considerações finais..."
                value={minutesText}
                onChange={(e) => setMinutesText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>

            {/* Deliberações & Decisões Convertíveis em Tarefas */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-slate-200 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Decisões Aprovadas nesta Reunião</span>
                </div>
                <button
                  onClick={() => setIsDecisionModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1 border border-slate-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar Decisão</span>
                </button>
              </div>

              {selectedMeeting.decisions.length === 0 ? (
                <p className="text-slate-400 text-center py-3 italic bg-slate-950 rounded-lg border border-slate-800">
                  Nenhuma decisão formal registrada ainda.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {selectedMeeting.decisions.map((dec) => (
                    <div
                      key={dec.id}
                      className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{dec.description}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                            {dec.category}
                          </span>
                        </div>
                        {dec.responsibleUser && (
                          <p className="text-[11px] text-slate-400">
                            Responsável acordado:{" "}
                            <span className="text-slate-300 font-medium">{dec.responsibleUser.name}</span>
                          </p>
                        )}
                      </div>

                      {/* Conversão em Tarefa */}
                      <div>
                        {dec.resultingTasks.length > 0 ? (
                          <Link
                            href={`/tasks/${dec.resultingTasks[0].id}`}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-emerald-400 border border-slate-700 font-mono text-[11px] font-semibold flex items-center gap-1"
                          >
                            <span>#{dec.resultingTasks[0].taskNumber} Tarefa Criada</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleConvertToTask(dec.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow"
                          >
                            <span>Converter em Tarefa</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL REGISTRAR DECISÃO */}
      {isDecisionModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">Registrar Decisão da Liderança</h3>
              <button onClick={() => setIsDecisionModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddDecision} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Deliberação / Decisão *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ex: Aquisição do sensor LiDAR resistente a poeira e redundância de bateria..."
                  value={decisionForm.description}
                  onChange={(e) => setDecisionForm({ ...decisionForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Justificativa da Decisão</label>
                <input
                  type="text"
                  placeholder="Ex: Mitigação de risco operacional no teste de campo..."
                  value={decisionForm.rationale}
                  onChange={(e) => setDecisionForm({ ...decisionForm, rationale: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Responsável pela Execução</label>
                  <select
                    value={decisionForm.responsibleUserId}
                    onChange={(e) => setDecisionForm({ ...decisionForm, responsibleUserId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  >
                    <option value="">Selecione o responsável...</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.title})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Categoria</label>
                  <select
                    value={decisionForm.category}
                    onChange={(e) => setDecisionForm({ ...decisionForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  >
                    <option value="TECNICA">Técnica</option>
                    <option value="OPERACIONAL">Operacional</option>
                    <option value="ESTRATEGICA">Estratégica</option>
                    <option value="PRODUTO">Produto</option>
                    <option value="FINANCEIRA">Financeira</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDecisionModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Salvar Decisão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AGENDAR REUNIÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">Agendar Reunião Executiva</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateMeeting} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Título da Reunião *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alinhamento Semanal da Liderança Executiva — ValTexa"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Objetivo da Reunião *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alinhamento de prioridades, validação técnica do Rover V3 e captação..."
                  value={form.objective}
                  onChange={(e) => setForm({ ...form, objective: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Data e Horário *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.scheduledStart}
                    onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Duração (minutos)</label>
                  <input
                    type="number"
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50">
                <input
                  type="checkbox"
                  id="smartAgenda"
                  checked={form.autoGenerateSmartAgenda}
                  onChange={(e) => setForm({ ...form, autoGenerateSmartAgenda: e.target.checked })}
                  className="rounded bg-slate-950 border-emerald-800 text-emerald-500"
                />
                <label htmlFor="smartAgenda" className="text-slate-300 cursor-pointer">
                  Gerar pauta automática conectada aos dados reais de atrasos e projetos
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Agendar e Notificar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
