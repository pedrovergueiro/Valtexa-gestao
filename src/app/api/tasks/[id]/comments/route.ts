import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content, isBlockerReport = false } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Conteúdo do comentário é obrigatório" }, { status: 400 });
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId: id,
        userId: user.userId,
        content: content.trim(),
        isBlockerReport: !!isBlockerReport,
      },
      include: {
        user: { select: { id: true, name: true, title: true, initials: true } },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Erro ao adicionar comentário:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

