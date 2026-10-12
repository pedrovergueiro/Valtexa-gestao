import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (category && category !== "ALL") where.category = category;

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const documents = await prisma.knowledgeDocument.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, title: true, initials: true } },
        project: { select: { id: true, name: true, code: true } },
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Erro ao listar base de conhecimento:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, content, category, accessLevel = "PUBLIC_INTERNAL", projectId } = body;

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: "Título, conteúdo e categoria são obrigatórios" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = await prisma.$transaction(async (tx: any) => {
      const createdDoc = await tx.knowledgeDocument.create({
        data: {
          title,
          description: description || null,
          content,
          category,
          accessLevel,
          projectId: projectId || null,
          authorId: user.userId,
          currentVersion: 1,
        },
      });

      await tx.documentVersion.create({
        data: {
          documentId: createdDoc.id,
          versionNumber: 1,
          content,
          changeNotes: "Criação inicial do documento",
          createdById: user.userId,
        },
      });

      return createdDoc;
    });

    await logAudit({
      userId: user.userId,
      action: "CREATE",
      entity: "KnowledgeDocument",
      entityId: doc.id,
      details: { title, category },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar documento:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

