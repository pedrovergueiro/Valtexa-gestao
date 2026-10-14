// Funções puras (sem dependências de Node) usadas no cliente e no servidor.

export type PreviewKind = "markdown" | "image" | "pdf" | "csv" | "text" | "none";

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

export function previewKind(name: string, mime: string): PreviewKind {
  const ext = extOf(name);
  if (ext === "md" || ext === "markdown" || mime === "text/markdown") return "markdown";
  if (ext === "csv" || mime === "text/csv") return "csv";
  if (mime === "application/pdf") return "pdf";
  // SVG pode conter script: só é oferecido para download
  if (mime.startsWith("image/") && mime !== "image/svg+xml") return "image";
  if (mime.startsWith("text/") || ext === "json") return "text";
  return "none";
}
