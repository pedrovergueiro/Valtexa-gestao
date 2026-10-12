"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  Search,
  Plus,
  BookOpen,
  Folder,
  Tag,
  Clock,
  User,
  ExternalLink,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface KnowledgeDoc {
  id: string;
  title: string;
  description?: string | null;
  content: string;
  category: string;
  accessLevel: string;
  currentVersion: number;
  author: { id: string; name: string; title: string };
  project?: { name: string; code: string } | null;
  updatedAt: string;
}

const CATEGORIES = [
  "ALL",
  "Governança e Operações",
  "Tecnologia e Engenharia",
  "Produto e Requisitos",
  "Comercial e Parcerias",
  "Estratégia e Captação",
  "Processos Internos",
  "Pesquisa e Desenvolvimento",
];

export default function KnowledgePage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    title: "",
    description: "",
    category: "Governança e Operações",
    content: "",
    accessLevel: "PUBLIC_INTERNAL",
  });

  const fetchDocs = async () => {
    try {
      const query = new URLSearchParams();
      if (selectedCategory !== "ALL") query.set("category", selectedCategory);
      if (search) query.set("search", search);

      const res = await fetch(`/api/knowledge?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocs(data);
        if (data.length > 0 && !selectedDoc) {
          setSelectedDoc(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [selectedCategory, search, user]);

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.title || !docForm.content) return;

    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docForm),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setDocForm({
          title: "",
          description: "",
          category: "Governança e Operações",
          content: "",
          accessLevel: "PUBLIC_INTERNAL",
        });
        fetchDocs();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao salvar documento");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              BASE DE CONHECIMENTO
            </span>
            <span className="text-xs text-slate-400">• Repositório Central de Inteligência</span>
          </div>
          <h1 className="text-lg font-bold text-slate-100">Documentação Corporativa</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manuais técnicos, diretrizes de governança, arquitetura do Rover V3 e procedimentos da ValTexa.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Documento</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título, resumo ou conteúdo técnico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg border font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-emerald-950/60 border-emerald-600 text-emerald-400"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat === "ALL" ? "Todas Categorias" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Documents List & Right Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-xs text-slate-400 p-6 text-center">Carregando...</div>
          ) : docs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
              Nenhum documento encontrado.
            </div>
          ) : (
            docs.map((d) => {
              const isSelected = selectedDoc?.id === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDoc(d)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-slate-900 border-emerald-500/70 shadow-lg"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-emerald-400">{d.category}</span>
                    <span className="text-[10px] text-slate-400 font-mono">v{d.currentVersion}.0</span>
                  </div>
                  <h3 className="font-semibold text-slate-100 text-xs mb-1 line-clamp-1">{d.title}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{d.description || d.content.slice(0, 100)}</p>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Autor: {d.author.name}</span>
                    <span>{new Date(d.updatedAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Reader */}
        {selectedDoc ? (
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {selectedDoc.category}
                </span>
                <h2 className="text-base font-bold text-slate-100 mt-1">{selectedDoc.title}</h2>
                <p className="text-xs text-slate-400">
                  Publicado por <span className="text-slate-200 font-semibold">{selectedDoc.author.name}</span> • Versão{" "}
                  {selectedDoc.currentVersion}.0
                </p>
              </div>
            </div>

            {selectedDoc.description && (
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 italic">
                {selectedDoc.description}
              </div>
            )}

            <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              {selectedDoc.content}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-12 text-center text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
            Selecione um documento ao lado para ler.
          </div>
        )}
      </div>

      {/* MODAL NOVO DOCUMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">Criar Documento na Base de Conhecimento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDoc} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Título do Documento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Protocolo de Segurança do ValTexa Rover em Campo..."
                  value={docForm.title}
                  onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Categoria *</label>
                  <select
                    value={docForm.category}
                    onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  >
                    {CATEGORIES.filter((c) => c !== "ALL").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Nível de Acesso</label>
                  <select
                    value={docForm.accessLevel}
                    onChange={(e) => setDocForm({ ...docForm, accessLevel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  >
                    <option value="PUBLIC_INTERNAL">Público Interno (Todos)</option>
                    <option value="RESTRICTED">Restrito aos Setores</option>
                    <option value="CONFIDENTIAL_LEADERSHIP">Confidencial (Liderança)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Resumo Executivo</label>
                <input
                  type="text"
                  placeholder="Breve sumário do conteúdo do documento..."
                  value={docForm.description}
                  onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Conteúdo Completo (Markdown) *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Escreva as diretrizes, procedimentos técnicos ou especificações em formato Markdown..."
                  value={docForm.content}
                  onChange={(e) => setDocForm({ ...docForm, content: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 font-mono text-xs leading-relaxed"
                />
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
                  Salvar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

