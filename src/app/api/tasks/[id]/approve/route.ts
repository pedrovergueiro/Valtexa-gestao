import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canApproveTask } from "@/lib/rbac";

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
    const { action, feedback } = body; // action: "APPROVE" | "REQUEST_CHANGES"

    if (!["APPROVE", "REQUEST_CHANGES"].includes(action)) {
      return NextResponse.json(
        { error: "Ação inválida. Use APPROVE ou REQUEST_CHANGES" },
        { status: 400 }
      );
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: { assignedTo: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }

    // Permissão: COO ou o criador original da tarefa
    if (!canApproveTask(user, task)) {
      return NextResponse.json(
        { error: "Apenas o COO ou o criador da tarefa pode homologar ou solicitar ajustes" },
        { status: 403 }
      );
    }

    if (task.status !== "AGUARDANDO_REVISAO") {
      return NextResponse.json(
        { error: "Esta tarefa não está aguardando aprovação" },
        { status: 400 }
      );
    }

    const isApproved = action === "APPROVE";
    const newStatus = isApproved ? "CONCLUIDA" : "AJUSTES_SOLICITADOS";
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Atualizar status da tarefa
      const updatedTask = await tx.task.update({
        where: { id },
        data: {
          status: newStatus,
          completedAt: isApproved ? now : null,
        },
      });

      // Gravar histórico de status
      await tx.taskStatusHistory.create({
        data: {
          taskId: id,
          oldStatus: task.status,
          newStatus,
          reason: feedback || (isApproved ? "Entrega aprovada" : "Ajustes solicitados"),
          changedById: user.userId,
        },
      });

      // Resolver a solicitação pendente (ou registrar uma, se não houver)
      const approvalStatus = isApproved ? "APROVADO" : "AJUSTES_SOLICITADOS";
      const resolved = await tx.approval.updateMany({
        where: { taskId: id, status: "PENDENTE" },
        data: {
          reviewerById: user.userId,
          status: approvalStatus,
          feedback: feedback || null,
          reviewedAt: now,
        },
      });
      if (resolved.count === 0) {
        await tx.approval.create({
          data: {
            taskId: id,
            requestedById: task.assignedToId || user.userId,
            reviewerById: user.userId,
            status: approvalStatus,
            feedback: feedback || null,
            reviewedAt: now,
          },
        });
      }

      // Notificar o responsável executor
      if (task.assignedToId) {
        await tx.notification.create({
          data: {
            userId: task.assignedToId,
            title: isApproved ? "Entrega Aprovada!" : "Ajustes Solicitados",
            message: isApproved
              ? `A sua entrega para "${task.title}" foi aprovada por ${user.name}.`
              : `${user.name} solicitou ajustes na tarefa "${task.title}". Feedback: ${feedback || "Consulte os comentários"}`,
            category: isApproved ? "APPROVAL_REQUEST" : "APPROVAL_REQUEST",
            link: `/tasks/${task.id}`,
          },
        });
      }

      return updatedTask;
    });

    await logAudit({
      userId: user.userId,
      action: isApproved ? "APPROVE" : "REJECT",
      entity: "Task",
      entityId: id,
      details: { action, feedback, oldStatus: task.status, newStatus },
    });

    return NextResponse.json({ success: true, task: result });
  } catch (error) {
    console.error("Erro na aprovação:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

