import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isCOO } from "@/lib/rbac";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isCOO(user)) {
      return NextResponse.json({ error: "Apenas o COO pode adicionar itens ao plano" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { userId, taskId, title, dayOfWeek, expectedDelivery, isPriority = false } = body;

    if (!userId || !title) {
      return NextResponse.json({ error: "Responsável e título são obrigatórios" }, { status: 400 });
    }

    const item = await prisma.weeklyPlanItem.create({
      data: {
        weeklyPlanId: id,
        userId,
        taskId: taskId || null,
        title,
        dayOfWeek: dayOfWeek ? parseInt(dayOfWeek) : null,
        expectedDelivery: expectedDelivery || null,
        isPriority: !!isPriority,
      },
      include: {
        user: { select: { id: true, name: true, title: true } },
        task: { select: { id: true, taskNumber: true, title: true, status: true } },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Erro ao adicionar item ao plano semanal:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

