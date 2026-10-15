"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  FolderKanban,
  Network,
  Users2,
  UsersRound,
  FileText,
  Paperclip,
  BarChart3,
  Bell,
  Bot,
  ShieldAlert,
  ChevronRight,
  FileCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isCOOUser = user?.roles.includes("COO");
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    if (!user) return;
    const loadCount = async () => {
      try {
        const res = await fetch("/api/approvals");
        if (res.ok) {
          const data = await res.json();
          setPendingApprovals(data.count || 0);
        }
      } catch {
        // ignore
      }
    };
    loadCount();
    const interval = setInterval(loadCount, 15000);
    window.addEventListener("approvals:changed", loadCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener("approvals:changed", loadCount);
    };
  }, [user, pathname]);

  const navigation = [
    { name: "Visão Geral", href: "/", icon: LayoutDashboard },
    { name: "Minha Agenda", href: "/my-agenda", icon: CalendarCheck },
    { name: "Agenda Executiva", href: "/weekly-plan", icon: CalendarDays },
    { name: "Tarefas", href: "/tasks", icon: CheckSquare },
    { name: "Aprovações", href: "/approvals", icon: FileCheck, badge: pendingApprovals },
    { name: "Projetos", href: "/projects", icon: FolderKanban },
    { name: "Organograma", href: "/org", icon: Network },
    { name: "Setores e Equipes", href: "/departments", icon: Users2 },
    { name: "Reuniões & Atas", href: "/meetings", icon: UsersRound },
    { name: "Base de Conhecimento", href: "/knowledge", icon: FileText },
    { name: "Arquivos", href: "/files", icon: Paperclip },
    { name: "Relatórios", href: "/reports", icon: BarChart3 },
    { name: "Assistente IA", href: "/assistant", icon: Bot },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand & Identity */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-900/30">
            VT
          </div>
          <div>
            <h1 className="font-semibold text-slate-100 text-sm tracking-wide">VALTEXA</h1>
            <p className="text-xs text-slate-400 font-medium">Gestão Corporativa</p>
          </div>
        </Link>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
          ERP v1.0
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Módulos Centrais
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-emerald-600/20 text-emerald-400 font-semibold border-l-2 border-emerald-500"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
              <span className="flex-1">{item.name}</span>
              {"badge" in item && !!item.badge && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-500/70" />}
            </Link>
          );
        })}
      </nav>

      {/* Role Notice & Governance Indicator */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="px-2 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Perfil Operacional:</span>
            <span className="font-semibold text-emerald-400">{user?.roles[0] || "..."}</span>
          </div>
          <p className="text-[11px] text-slate-300 font-medium truncate">{user?.name}</p>
          <p className="text-[10px] text-slate-400 truncate">{user?.title}</p>
        </div>
      </div>
    </aside>
  );
}

