import path from "path";
import { extOf } from "./filePreview";

export { extOf, previewKind } from "./filePreview";
export type { PreviewKind } from "./filePreview";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB por arquivo

const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  json: "application/json",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

// Navegadores/SO costumam mandar tipo vazio para .md e .csv; a extensão decide.
export function resolveMime(name: string, declared: string): string {
  return EXT_MIME[extOf(name)] || declared || "application/octet-stream";
}

export function safeDisplayName(name: string): string {
  return path.basename(name).replace(/[\r\n"]/g, "_").slice(0, 200) || "arquivo";
}
