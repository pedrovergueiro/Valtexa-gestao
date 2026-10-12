"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users2,
  Building,
  Shield,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight,
  FolderKanban,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface DeptDetail {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  color: string;
  members: Array<{ id: string; name: string; title: string; initials?: string }>;
  projects: Array<{ id: string; name: string; code: string }>;
  tasksCount: number;
}

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<DeptDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetch("/api/org");
        if (res.ok) {
          const data = await res.json();
          const orgUsers = data.users || [];
          const rawDepts = data.departments || [];

          const enriched = rawDepts.map((d: any) => ({
            id: d.id,
            name: d.name,
            code: d.code,
            description: d.description,
            color: d.color,
            members: orgUsers.filter((u: any) => u.department?.id === d.id),
            projects: [],
            tasksCount: d._count?.tasks || 0,
          }));

          setDepartments(enriched);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDepts();
  }, [user]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Carregando setores e equipes...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
            DIVISÃO OPERACIONAL
          </span>
          <span className="text-xs text-slate-400">• Setores & Especialidades da ValTexa</span>
        </div>
        <h1 className="text-lg font-bold text-slate-100">Setores e Equipes Corporativas</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Organização das áreas funcionais com autonomia de gestão e lideranças setoriais.
        </p>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.map((dept) => {
          // Identificar o líder do setor
          const leader = dept.members.find((m) =>
            ["Chief Operating Officer", "Chief Executive Officer", "Chief Technology Officer", "Chief Product Officer"].some((title) => m.title.includes(title))
          ) || dept.members[0];

          return (
            <div key={dept.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: dept.color || "#10b981" }}
                  />
                  <h2 className="text-sm font-bold text-slate-100">{dept.name}</h2>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {dept.code}
                </span>
              </div>

              {dept.description && (
                <p className="text-xs text-slate-400 leading-relaxed">{dept.description}</p>
              )}

              {/* Leader card */}
              {leader && (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Líder do Setor:</span>
                    <span className="font-bold text-slate-200 block text-xs mt-0.5">{leader.name}</span>
                    <span className="text-[10px] text-slate-400">{leader.title}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Liderança
                  </span>
                </div>
              )}

              {/* Members */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Integrantes da Equipe ({dept.members.length}):
                </span>
                <div className="space-y-1.5">
                  {dept.members.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-[10px] border border-slate-700">
                          {m.initials || m.name[0]}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-200 block">{m.name}</span>
                          <span className="text-[10px] text-slate-400 block">{m.title}</span>
                        </div>
                      </div>
                      <Link
                        href={`/tasks?assignedToId=${m.id}`}
                        className="text-[10px] text-emerald-400 hover:underline font-semibold"
                      >
                        Tarefas →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sector Tasks Link */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">{dept.tasksCount} tarefas registradas</span>
                <Link
                  href={`/tasks?departmentId=${dept.id}`}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  <span>Ver Tarefas do Setor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

