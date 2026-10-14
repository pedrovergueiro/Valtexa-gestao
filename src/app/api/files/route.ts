import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { MAX_FILE_SIZE, UPLOAD_DIR, extOf, resolveMime, safeDisplayName } from "@/lib/files";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const files = await prisma.uploadedFile.findMany({
      include: { uploadedBy: { select: { id: true, name: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error("Erro ao listar arquivos:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const form = await request.formData();
    const description = (form.get("description") as string | null)?.trim() || null;
    const incoming = form.getAll("files").filter((f): f is File => f instanceof File);

    if (incoming.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const tooBig = incoming.find((f) => f.size > MAX_FILE_SIZE);
    if (tooBig) {
      return NextResponse.json(
        { error: `"${tooBig.name}" excede o limite de ${MAX_FILE_SIZE / 1024 / 1024} MB` },
        { status: 413 }
      );
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const created = [];
    for (const file of incoming) {
      const originalName = safeDisplayName(file.name);
      const ext = extOf(originalName).replace(/[^a-z0-9]/g, "");
      const storedName = ext ? `${randomUUID()}.${ext}` : randomUUID();

      await writeFile(path.join(UPLOAD_DIR, storedName), Buffer.from(await file.arrayBuffer()));

      const record = await prisma.uploadedFile.create({
        data: {
          originalName,
          storedName,
          mimeType: resolveMime(originalName, file.type),
          size: file.size,
          description,
          uploadedById: user.userId,
        },
      });

      await logAudit({
        userId: user.userId,
        action: "CREATE",
        entity: "UploadedFile",
        entityId: record.id,
        details: { originalName, size: file.size },
      });

      created.push(record);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Erro ao enviar arquivos:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
