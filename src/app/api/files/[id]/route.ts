import { NextResponse } from "next/server";
import { readFile, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isExecutive } from "@/lib/rbac";
import { UPLOAD_DIR, previewKind } from "@/lib/files";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const file = await prisma.uploadedFile.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }

    const buffer = await readFile(path.join(UPLOAD_DIR, file.storedName));
    const forceDownload = new URL(request.url).searchParams.get("download") === "1";
    // Só exibe inline o que é seguro renderizar; o resto sempre baixa.
    const inline = !forceDownload && previewKind(file.originalName, file.mimeType) !== "none";
    const disposition = inline ? "inline" : "attachment";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Erro ao ler arquivo:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const file = await prisma.uploadedFile.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }

    if (file.uploadedById !== user.userId && !isExecutive(user)) {
      return NextResponse.json({ error: "Sem permissão para excluir este arquivo" }, { status: 403 });
    }

    await prisma.uploadedFile.delete({ where: { id } });
    await unlink(path.join(UPLOAD_DIR, file.storedName)).catch(() => {});

    await logAudit({
      userId: user.userId,
      action: "DELETE",
      entity: "UploadedFile",
      entityId: id,
      details: { originalName: file.originalName },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir arquivo:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
