"use client";

import React, { useState, useEffect } from "react";
import { Bell, Search, UserCheck, Shield, ChevronDown, Check, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export function Header() {
  const { user, logout } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    fetchNotifications();
  };

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input */}
      <div className="relative w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Busca global (tarefas, projetos, atas, decisões)..."
          className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Timezone Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/60 border border-slate-800 text-[11px] text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>America/Sao_Paulo (BRT)</span>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Notificações Internas"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <span className="text-xs font-semibold text-slate-200">Notificações</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300"
                  >
                    Marcar lidas
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Nenhuma notificação recente.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-lg text-xs border ${
                        n.isRead
                          ? "bg-slate-950/40 border-slate-800/60 text-slate-400"
                          : "bg-slate-800/70 border-emerald-500/30 text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-[11px] mb-0.5">
                        <span className={n.isRead ? "text-slate-400" : "text-emerald-400"}>{n.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed mb-1">{n.message}</p>
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => setShowNotifications(false)}
                          className="text-[10px] text-emerald-400 hover:underline block"
                        >
                          Ver registro →
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-200 transition-colors"
          >
            <div className="w-6 h-6 rounded bg-emerald-600/30 text-emerald-400 font-bold flex items-center justify-center text-[11px] border border-emerald-500/30">
              {user?.initials || user?.name?.[0] || "U"}
            </div>
            <div className="text-left hidden md:block">
              <span className="font-medium text-slate-200 block text-xs">{user?.name}</span>
              <span className="text-[10px] text-emerald-400 font-mono block -mt-0.5">{user?.roles[0]}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2">
              <div className="px-3 py-2 border-b border-slate-800 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300 block">{user?.name}</span>
                {user?.email}
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

