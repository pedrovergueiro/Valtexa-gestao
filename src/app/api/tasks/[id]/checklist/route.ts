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
    const { title } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Título do item é obrigatório" }, { status: 400 });
    }

    const lastItem = await prisma.checklistItem.findFirst({
      where: { taskId: id },
      orderBy: { position: "desc" },
    });

    const newItem = await prisma.checklistItem.create({
      data: {
        taskId: id,
        title: title.trim(),
        position: (lastItem?.position || 0) + 1,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("Erro ao adicionar item de checklist:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(
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
    const { itemId, isCompleted } = body;

    if (!itemId) {
      return NextResponse.json({ error: "ID do item não fornecido" }, { status: 400 });
    }

    const updated = await prisma.checklistItem.update({
      where: { id: itemId, taskId: id },
      data: {
        isCompleted: !!isCompleted,
        completedAt: isCompleted ? new Date() : null,
        completedById: isCompleted ? user.userId : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao alternar checklist:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

