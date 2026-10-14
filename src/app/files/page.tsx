"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  UploadCloud,
  FileText,
  FileImage,
  FileSpreadsheet,
  File as FileIcon,
  Download,
  Trash2,
  X,
  Eye,
  Search,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { previewKind, type PreviewKind } from "@/lib/filePreview";

interface StoredFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  description?: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string; title: string };
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Parser CSV mínimo (aspas, vírgula/ponto e vírgula, quebras de linha dentro de aspas)
function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function iconFor(kind: PreviewKind, name: string) {
  if (kind === "image") return FileImage;
  if (kind === "csv" || /\.xlsx?$/i.test(name)) return FileSpreadsheet;
  if (kind === "markdown" || kind === "text" || kind === "pdf" || /\.docx?$/i.test(name)) return FileText;
  return FileIcon;
}

function Preview({ file }: { file: StoredFile }) {
  const kind = previewKind(file.originalName, file.mimeType);
  const url = `/api/files/${file.id}`;
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setText(null);
    setError(false);
    if (kind !== "markdown" && kind !== "csv" && kind !== "text") return;
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((t) => !cancelled && setText(t))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [url, kind]);

  if (kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={file.originalName} className="max-w-full max-h-[70vh] mx-auto rounded-lg" />;
  }
  if (kind === "pdf") {
    return <iframe src={url} title={file.originalName} className="w-full h-[70vh] rounded-lg bg-white" />;
  }
  if (kind === "none") {
    return (
      <div className="text-center text-sm text-slate-400 py-16">
        Sem pré-visualização para este formato. Use o botão de download para abrir o arquivo.
      </div>
    );
  }
  if (error) return <div className="text-sm text-rose-400 py-8 text-center">Não foi possível carregar o arquivo.</div>;
  if (text === null) return <div className="text-sm text-slate-400 py-8 text-center">Carregando...</div>;

  if (kind === "markdown") {
    return (
      <div className="md-preview text-sm text-slate-200 leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    );
  }
  if (kind === "csv") {
    const rows = parseCsv(text);
    const [head, ...body] = rows;
    return (
      <div className="overflow-auto max-h-[70vh] rounded-lg border border-slate-800">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-800 text-slate-300 sticky top-0">
            <tr>
              {(head ?? []).map((h, i) => (
                <th key={i} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.slice(0, 500).map((r, i) => (
              <tr key={i} className="border-t border-slate-800 text-slate-300">
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-1.5 whitespace-nowrap">{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {body.length > 500 && (
          <p className="text-[11px] text-slate-500 p-2">Mostrando as primeiras 500 de {body.length} linhas.</p>
        )}
      </div>
    );
  }
  return (
    <pre className="text-xs text-slate-200 whitespace-pre-wrap bg-slate-950/60 p-4 rounded-xl border border-slate-800 max-h-[70vh] overflow-auto">
      {text}
    </pre>
  );
}

export default function FilesPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StoredFile | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files");
      if (res.ok) setFiles(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const upload = async (list: FileList | File[]) => {
    const picked = Array.from(list);
    if (picked.length === 0) return;
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      picked.forEach((f) => form.append("files", f));
      const res = await fetch("/api/files", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error || "Falha no envio" });
        return;
      }
      setMessage({ type: "ok", text: `${data.length} arquivo(s) enviado(s) com sucesso.` });
      await fetchFiles();
      // Markdown recém-enviado já abre renderizado
      const md = data.find((f: StoredFile) => previewKind(f.originalName, f.mimeType) === "markdown");
      if (md) setSelected({ ...md, uploadedBy: { id: user?.id ?? "", name: user?.name ?? "", title: user?.title ?? "" } });
    } catch {
      setMessage({ type: "err", text: "Falha de conexão ao enviar." });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (file: StoredFile) => {
    if (!confirm(`Excluir "${file.originalName}"?`)) return;
    const res = await fetch(`/api/files/${file.id}`, { method: "DELETE" });
    if (res.ok) {
      if (selected?.id === file.id) setSelected(null);
      fetchFiles();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "err", text: data.error || "Não foi possível excluir." });
    }
  };

  const visible = files.filter((f) =>
    `${f.originalName} ${f.description ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Arquivos</h1>
        <p className="text-xs text-slate-400 mt-1">
          Envie relatórios, planilhas, documentos, imagens e Markdown. Markdown, PDF, imagens, CSV e texto
          podem ser visualizados direto aqui.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-emerald-500 bg-emerald-950/30" : "border-slate-700 bg-slate-900/60 hover:border-slate-500"
        }`}
      >
        <UploadCloud className="w-9 h-9 mx-auto text-emerald-400 mb-2" />
        <p className="text-sm text-slate-200 font-medium">
          {uploading ? "Enviando..." : "Arraste arquivos aqui ou clique para selecionar"}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          PDF, CSV, DOCX, XLSX, JPEG/PNG, MD e qualquer outro formato — até 25 MB por arquivo
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      {message && (
        <div
          className={`text-xs rounded-lg px-3 py-2 border ${
            message.type === "ok"
              ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
              : "bg-rose-950/40 border-rose-800 text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className={selected ? "xl:col-span-2" : "xl:col-span-5"}>
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar arquivo..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {loading ? (
            <p className="text-xs text-slate-400">Carregando...</p>
          ) : visible.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-10">Nenhum arquivo enviado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {visible.map((f) => {
                const kind = previewKind(f.originalName, f.mimeType);
                const Icon = iconFor(kind, f.originalName);
                const canDelete = f.uploadedBy.id === user?.id || user?.roles.some((r) => ["COO", "CEO", "CTO", "CPO"].includes(r));
                return (
                  <li
                    key={f.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 bg-slate-900/70 ${
                      selected?.id === f.id ? "border-emerald-600" : "border-slate-800"
                    }`}
                  >
                    <Icon className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-100 truncate">{f.originalName}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {formatSize(f.size)} · {f.uploadedBy.name} · {new Date(f.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {kind !== "none" && (
                      <button
                        onClick={() => setSelected(f)}
                        title="Visualizar"
                        className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <a
                      href={`/api/files/${f.id}?download=1`}
                      title="Baixar"
                      className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    {canDelete && (
                      <button
                        onClick={() => remove(f)}
                        title="Excluir"
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-slate-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selected && (
          <div className="xl:col-span-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-100 truncate">{selected.originalName}</h2>
                <p className="text-[11px] text-slate-500">{formatSize(selected.size)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Preview file={selected} />
          </div>
        )}
      </div>
    </div>
  );
}
