"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Network,
  List,
  User,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Shield,
  Layers,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface OrgUser {
  id: string;
  name: string;
  email: string;
  title: string;
  initials: string;
  department?: { id: string; name: string; code: string; color: string } | null;
  roles: string[];
  manager?: { id: string; name: string; title: string } | null;
  subordinatesCount: number;
  subordinateIds: string[];
  activeTasksCount: number;
  delayedTasksCount: number;
  status: "NORMAL" | "ATENCAO" | "SOBRECARREGADO";
}

interface Department {
  id: string;
  name: string;
  code: string;
  color: string;
  _count: { members: number; tasks: number; projects: number };
}

export default function OrgPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [viewMode, setViewMode] = useState<"VISUAL" | "LIST">("VISUAL");
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Modal para criar/alterar subordinação
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
  const [relationForm, setRelationForm] = useState({
    managerId: "",
    subordinateId: "",
    notes: "",
  });

  const isCOOUser = user?.roles.includes("COO");

  const fetchOrg = async () => {
    try {
      const res = await fetch("/api/org");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrg();
  }, [user]);

  const handleSaveRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relationForm.managerId || !relationForm.subordinateId) return;

    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(relationForm),
      });

      if (res.ok) {
        setIsRelationModalOpen(false);
        setRelationForm({ managerId: "", subordinateId: "", notes: "" });
        fetchOrg();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao salvar subordinação");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Carregando organograma da ValTexa...</div>;
  }

  // Filtrar usuários
  const filteredUsers = users.filter((u) => {
    if (selectedDeptFilter !== "ALL" && u.department?.id !== selectedDeptFilter) return false;
    return true;
  });

  // Identificar COO (raiz operacional)
  const cooUser = users.find((u) => u.roles.includes("COO"));
  // Os outros fundadores coordenados pelo COO
  const founders = users.filter((u) => u.roles.some((r) => ["CEO", "CTO", "CPO"].includes(r)));
  // Especialistas subordinados a cada fundador
  const specialists = users.filter((u) => !u.roles.some((r) => ["COO", "CEO", "CTO", "CPO"].includes(r)));

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              ESTRUTURA ORGANIZACIONAL
            </span>
            <span className="text-xs text-slate-400">• Relações Vivas e Dinâmicas</span>
          </div>
          <h1 className="text-lg font-bold text-slate-100">Organograma Corporativo da ValTexa</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Coordenação operacional semanal sem alterar a autoridade societária e legal entre fundadores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Switch View Mode */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setViewMode("VISUAL")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                viewMode === "VISUAL"
                  ? "bg-emerald-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Visual</span>
            </button>
            <button
              onClick={() => setViewMode("LIST")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                viewMode === "LIST"
                  ? "bg-emerald-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {isCOOUser && (
            <button
              onClick={() => setIsRelationModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajustar Hierarquia</span>
            </button>
          )}
        </div>
      </div>

      {/* Department Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-medium">Filtrar Setor:</span>
        <button
          onClick={() => setSelectedDeptFilter("ALL")}
          className={`px-3 py-1 rounded-lg border font-medium transition-colors ${
            selectedDeptFilter === "ALL"
              ? "bg-emerald-950/60 border-emerald-600 text-emerald-400"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          Todos ({users.length})
        </button>
        {departments.map((dept) => (
          <button
            key={dept.id}
            onClick={() => setSelectedDeptFilter(dept.id)}
            className={`px-3 py-1 rounded-lg border font-medium transition-colors ${
              selectedDeptFilter === dept.id
                ? "bg-emerald-950/60 border-emerald-600 text-emerald-400"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {dept.name} ({dept._count.members})
          </button>
        ))}
      </div>

      {/* Visual Org View */}
      {viewMode === "VISUAL" && (
        <div className="space-y-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-8 overflow-x-auto">
          {/* LEVEL 1: COO (Operações Globais) */}
          {cooUser && (
            <div className="flex flex-col items-center">
              <div className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-semibold mb-2">
                NÍVEL 1 • COORDENAÇÃO OPERACIONAL GERAL
              </div>
              <OrgUserCard user={cooUser} onSelect={() => setSelectedUser(cooUser)} isTopLevel />
              {/* Connector Line */}
              <div className="w-0.5 h-8 bg-slate-700" />
            </div>
          )}

          {/* LEVEL 2: CEO, CTO, CPO */}
          <div className="relative">
            <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-semibold text-center mb-3">
              NÍVEL 2 • DIRETORES EXECUTIVOS SETORIAIS
            </div>
            {/* Horizontal Bar */}
            <div className="hidden md:block absolute top-7 left-1/4 right-1/4 h-0.5 bg-slate-700" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {founders.map((founder) => (
                <div key={founder.id} className="flex flex-col items-center">
                  <OrgUserCard user={founder} onSelect={() => setSelectedUser(founder)} />

                  {/* Subordinates of this executive */}
                  {users.filter((u) => u.manager?.id === founder.id).length > 0 && (
                    <>
                      <div className="w-0.5 h-6 bg-slate-700" />
                      <div className="w-full space-y-3">
                        <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 text-center">
                          Equipe de {founder.department?.code}
                        </div>
                        {users
                          .filter((u) => u.manager?.id === founder.id)
                          .map((sub) => (
                            <OrgUserCard
                              key={sub.id}
                              user={sub}
                              onSelect={() => setSelectedUser(sub)}
                              isSpecialist
                            />
                          ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Alternative List View (Mobile-Friendly) */}
      {viewMode === "LIST" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Cargo & Setor</th>
                <th className="py-3 px-4">Líder Operacional</th>
                <th className="py-3 px-4 text-center">Tarefas Ativas</th>
                <th className="py-3 px-4 text-center">Atrasadas</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-xs border border-slate-700">
                        {u.initials}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-200 block">{u.name}</span>
                        <span className="text-[10px] text-slate-400">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-300 block">{u.title}</span>
                    <span className="text-[10px] text-slate-400">{u.department?.name || "Geral"}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-300">{u.manager?.name || "Conselho / Geral"}</span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-200">{u.activeTasksCount}</td>
                  <td className="py-3 px-4 text-center">
                    {u.delayedTasksCount > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 font-semibold border border-rose-900 text-[10px]">
                        {u.delayedTasksCount}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="text-emerald-400 hover:underline font-semibold"
                    >
                      Perfil →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE PERFIL CORPORATIVO DO USUÁRIO SELECIONADO */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/40">
                  {selectedUser.initials}
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{selectedUser.name}</h3>
                  <p className="text-[11px] text-slate-400">{selectedUser.title}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Setor:</span>
                  <span className="font-semibold text-slate-200">{selectedUser.department?.name || "Geral"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Líder Imediato:</span>
                  <span className="font-semibold text-slate-200">{selectedUser.manager?.name || "Coordenação Geral"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Liderados Diretos:</span>
                  <span className="font-semibold text-slate-200">{selectedUser.subordinatesCount} membros</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Tarefas em Andamento</span>
                  <span className="text-lg font-bold text-slate-100">{selectedUser.activeTasksCount}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Tarefas Atrasadas</span>
                  <span className={`text-lg font-bold ${selectedUser.delayedTasksCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {selectedUser.delayedTasksCount}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/tasks?assignedToId=${selectedUser.id}`}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-center block transition-colors"
                >
                  Ver Tarefas Deste Colaborador →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA AJUSTAR HIERARQUIA (COO/ADMIN) */}
      {isRelationModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">Ajustar Linha de Subordinação</h3>
              <button onClick={() => setIsRelationModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRelation} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Líder Operacional *</label>
                <select
                  required
                  value={relationForm.managerId}
                  onChange={(e) => setRelationForm({ ...relationForm, managerId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                >
                  <option value="">Selecione o líder...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.title})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Liderado / Subordinado *</label>
                <select
                  required
                  value={relationForm.subordinateId}
                  onChange={(e) => setRelationForm({ ...relationForm, subordinateId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                >
                  <option value="">Selecione o subordinado...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.title})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRelationModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Salvar Relação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponente Card do Organograma
function OrgUserCard({
  user,
  onSelect,
  isTopLevel = false,
  isSpecialist = false,
}: {
  user: OrgUser;
  onSelect: () => void;
  isTopLevel?: boolean;
  isSpecialist?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.02] shadow-xl ${
        isTopLevel
          ? "bg-emerald-950/30 border-emerald-500/60 w-80"
          : isSpecialist
          ? "bg-slate-950/80 border-slate-800 hover:border-slate-700 w-full"
          : "bg-slate-950 border-slate-800 hover:border-slate-700 w-full"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-lg font-bold flex items-center justify-center text-xs border ${
            isTopLevel
              ? "bg-emerald-600 text-white border-emerald-400"
              : "bg-slate-800 text-emerald-400 border-slate-700"
          }`}
        >
          {user.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-slate-100 text-xs truncate">{user.name}</h4>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              {user.roles[0]}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">{user.title}</p>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
        <div className="text-slate-400">
          <span>{user.activeTasksCount} ativas</span>
        </div>
        {user.delayedTasksCount > 0 ? (
          <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 text-[10px] font-semibold border border-rose-900">
            {user.delayedTasksCount} atrasadas
          </span>
        ) : (
          <span className="text-[10px] text-emerald-400 font-medium">Sem atrasos</span>
        )}
      </div>
    </div>
  );
}
