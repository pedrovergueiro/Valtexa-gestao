import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

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
    const { title, description, assignedToId, dueDate, estimatedHours, priority = "MEDIA" } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Título da subtarefa é obrigatório" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Tarefa pai não encontrada" }, { status: 404 });
    }

    const subtask = await prisma.subtask.create({
      data: {
        taskId: id,
        title: title.trim(),
        description: description || null,
        assignedToId: assignedToId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        priority,
        createdById: user.userId,
      },
      include: {
        assignedTo: { select: { id: true, name: true, title: true } },
      },
    });

    // Notificar o membro da equipe se atribuído
    if (assignedToId && assignedToId !== user.userId) {
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          title: "Nova subtarefa delegada",
          message: `${user.name} delegou a você a subtarefa "${title}" (da tarefa #${task.taskNumber})`,
          category: "TASK_ASSIGNED",
          link: `/tasks/${task.id}`,
        },
      });
    }

    await logAudit({
      userId: user.userId,
      action: "CREATE",
      entity: "Subtask",
      entityId: subtask.id,
      details: { taskId: id, title, assignedToId },
    });

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar subtarefa:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

