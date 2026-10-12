"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  FileCheck,
  User,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface MyTask {
  id: string;
  taskNumber: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  requiresApproval: boolean;
  department?: { name: string } | null;
  checklistItems: Array<{ id: string; isCompleted: boolean }>;
}

export default function MyAgendaPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchMyTasks = async () => {
      try {
        const res = await fetch(`/api/tasks?assignedToId=${user.id}`);
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
    fetchMyTasks();
  }, [user]);

  const now = new Date();
  const pendingTasks = tasks.filter((t) => t.status !== "CONCLUIDA" && t.status !== "CANCELADA");
  const completedTasks = tasks.filter((t) => t.status === "CONCLUIDA");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
            ESPAÇO INDIVIDUAL
          </span>
          <span className="text-xs text-slate-400">• Painel Operacional Pessoal</span>
        </div>
        <h1 className="text-lg font-bold text-slate-100">Minha Agenda & Atribuições</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Atividades atribuídas a <span className="text-slate-200 font-semibold">{user?.name}</span> ({user?.title}).
        </p>
      </div>

      {/* KPI mini-cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Tarefas em Aberto</span>
          <span className="text-2xl font-bold text-slate-100">{pendingTasks.length}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Tarefas Concluídas</span>
          <span className="text-2xl font-bold text-emerald-400">{completedTasks.length}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Total de Atribuições</span>
          <span className="text-2xl font-bold text-slate-100">{tasks.length}</span>
        </div>
      </div>

      {/* List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
          Tarefas Pendentes para Execução
        </h2>

        {loading ? (
          <div className="text-xs text-slate-400 py-6 text-center">Carregando suas tarefas...</div>
        ) : pendingTasks.length === 0 ? (
          <div className="text-xs text-slate-400 py-8 text-center italic bg-slate-950 rounded-lg border border-slate-800">
            Você não possui tarefas pendentes no momento.
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendingTasks.map((task) => {
              const isDelayed = task.dueDate && new Date(task.dueDate) < now;
              const completedCheck = task.checklistItems.filter((i) => i.isCompleted).length;
              return (
                <div
                  key={task.id}
                  className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-400 font-bold">#{task.taskNumber}</span>
                      <span className="font-semibold text-slate-200">{task.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {task.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400">
                      <span>Setor: {task.department?.name || "Geral"}</span>
                      {task.checklistItems.length > 0 && (
                        <span>
                          Checklist: {completedCheck}/{task.checklistItems.length}
                        </span>
                      )}
                      <span className={isDelayed ? "text-rose-400 font-semibold" : ""}>
                        Prazo: {task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : "Sem prazo"}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/tasks/${task.id}`}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

