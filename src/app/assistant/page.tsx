"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bot,
  Send,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ id: string; title: string; link: string }>;
  updatedAt?: string;
}

const QUICK_QUESTIONS = [
  "Quais tarefas estão atrasadas na empresa?",
  "O que o CTO precisa entregar nesta semana?",
  "Quais tarefas estão bloqueadas por dependências ou impedimentos?",
  "O que precisamos discutir na próxima reunião semanal?",
  "Quais decisões deliberadas continuam pendentes de execução?",
];

export default function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      content: `Olá, ${user?.name || "Líder"}! Eu sou o **Assistente de Inteligência Gerencial da ValTexa**.\n\nMinhas respostas são estritamente ancoradas nos dados reais persistidos no banco de dados corporativo (tarefas, agenda dos sócios, atas de reuniões, decisões e projetos).\n\nVocê pode me fazer perguntas em linguagem natural ou clicar em uma das consultas rápidas abaixo.`,
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMsg: AssistantMessage = { role: "user", content: queryText };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer,
            sources: data.sources || [],
            updatedAt: data.updatedAt,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Desculpe, ocorreu uma instabilidade ao consultar os indicadores corporativos.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Erro de comunicação com o serviço de inteligência gerencial.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
            ASSISTENTE DE GESTÃO
          </span>
          <span className="text-xs text-slate-400">• Inteligência Ancorada em Dados Oficiais</span>
        </div>
        <h1 className="text-lg font-bold text-slate-100">Assistente Executivo da Liderança</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Respostas objetivas baseadas no estado real do ERP corporativo (sem dados alucinados ou alteração autônoma de registros).
        </p>
      </div>

      {/* Quick Questions Pills */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Consultas Rápidas de Governança:
        </span>
        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSendQuery(q)}
              className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>{q}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[420px] max-h-[550px] overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 text-xs ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 border border-emerald-500/40">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`p-4 rounded-2xl max-w-2xl leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-emerald-600 text-white font-medium rounded-tr-none shadow-md"
                  : "bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-xl"
              }`}
            >
              {m.content}

              {/* Source links if available */}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Registros Consultados:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {m.sources.map((s) => (
                      <Link
                        key={s.id}
                        href={s.link}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-800 hover:border-emerald-500 transition-colors flex items-center gap-1"
                      >
                        <span>{s.title}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Consultando dados persistidos no banco...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendQuery(inputQuery);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          placeholder="Faça uma pergunta sobre o andamento operacional da ValTexa..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 shadow-inner"
        />
        <button
          type="submit"
          disabled={loading || !inputQuery.trim()}
          className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
        >
          <Send className="w-4 h-4" />
          <span>Consultar</span>
        </button>
      </form>
    </div>
  );
}

