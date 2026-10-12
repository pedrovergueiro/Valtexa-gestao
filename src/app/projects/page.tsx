"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  User,
  Building,
  Target,
  ArrowRight,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface ProjectItem {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  status: string;
  priority: string;
  budgetEstimated?: number | null;
  startDate?: string | null;
  targetEndDate?: string | null;
  lead?: { id: string; name: string; title: string; initials?: string } | null;
  department?: { id: string; name: string; code: string } | null;
  milestones: Array<{ id: string; title: string; dueDate: string; status: string }>;
  tasks: Array<{
    id: string;
    taskNumber: number;
    title: string;
    status: string;
    priority: string;
    dueDate?: string | null;
    assignedTo?: { name: string } | null;
  }>;
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    priority: "ALTA",
    budgetEstimated: "",
    startDate: "",
    targetEndDate: "",
  });

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          name: "",
          code: "",
          description: "",
          priority: "ALTA",
          budgetEstimated: "",
          startDate: "",
          targetEndDate: "",
        });
        fetchProjects();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao criar projeto");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Carregando projetos da ValTexa...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              PROJETOS & MARCOS
            </span>
            <span className="text-xs text-slate-400">• Engenharia, Robótica, SaaS & Captação</span>
          </div>
          <h1 className="text-lg font-bold text-slate-100">Projetos Estratégicos</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Acompanhamento integrado de marcos, orçamentos e tarefas do ValTexa Rover V3 e iniciativas-chave.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Projeto</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((proj) => {
          const completedTasks = proj.tasks.filter((t) => t.status === "CONCLUIDA").length;
          const totalTasks = proj.tasks.length;
          const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          return (
            <div
              key={proj.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {proj.code}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                    {proj.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{proj.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {proj.description || "Sem descrição cadastrada."}
                  </p>
                </div>

                {/* Lead & Department */}
                <div className="pt-2 border-t border-slate-800 text-xs flex items-center justify-between text-slate-400">
                  <span>Líder do Projeto:</span>
                  <span className="font-semibold text-slate-200">{proj.lead?.name || "Não atribuído"}</span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Progresso das Tarefas</span>
                    <span className="font-semibold text-slate-300">
                      {completedTasks}/{totalTasks} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Milestones count */}
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Marcos Técnicos:</span>
                  </div>
                  <span className="font-semibold text-slate-200">{proj.milestones.length} definidos</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  {proj.budgetEstimated ? `Orç. R$ ${proj.budgetEstimated.toLocaleString("pt-BR")}` : "Sem orçamento"}
                </span>
                <Link
                  href={`/tasks?projectId=${proj.id}`}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  <span>Tarefas do Projeto</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL NOVO PROJETO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">Cadastrar Novo Projeto Corporativo</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-300 block mb-1">Nome do Projeto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: ValTexa Rover V4"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    placeholder="VTX-ROV4"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Descrição</label>
                <textarea
                  rows={2}
                  placeholder="Objetivo estratégico do projeto e impacto na lavoura..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Orçamento Estimado (R$)</label>
                  <input
                    type="number"
                    placeholder="Ex: 100000"
                    value={formData.budgetEstimated}
                    onChange={(e) => setFormData({ ...formData, budgetEstimated: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Prioridade</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  >
                    <option value="CRITICA">Crítica</option>
                    <option value="ALTA">Alta</option>
                    <option value="MEDIA">Média</option>
                  </select>
                </div>
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
                  Criar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

