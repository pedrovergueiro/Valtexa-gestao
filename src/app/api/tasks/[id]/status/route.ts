import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isCOO } from "@/lib/rbac";

const VALID_STATUSES = [
  "RASCUNHO",
  "PLANEJADA",
  "AGUARDANDO_INICIO",
  "EM_ANDAMENTO",
  "BLOQUEADA",
  "AGUARDANDO_REVISAO",
  "AJUSTES_SOLICITADOS",
  "CONCLUIDA",
  "CANCELADA",
];

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
    const { status: targetStatus, reason } = body;

    if (!VALID_STATUSES.includes(targetStatus)) {
      return NextResponse.json(
        { error: `Estado inválido. Válidos: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        checklistItems: true,
        predecessorDependencies: { include: { predecessor: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }

    const isAssigned = task.assignedToId === user.userId;
    const isCreator = task.createdById === user.userId;
    const isGlobalCOO = isCOO(user);

    // Permissão: responsável, criador ou COO
    if (!isAssigned && !isCreator && !isGlobalCOO) {
      return NextResponse.json(
        { error: "Você não tem permissão para alterar o estado desta tarefa" },
        { status: 403 }
      );
    }

    // Regra de Negócio: Se a tarefa requer aprovação e o executor tenta concluir diretamente
    if (targetStatus === "CONCLUIDA" && task.requiresApproval) {
      // Somente o COO ou o criador da tarefa pode aprovar/concluir diretamente
      if (!isGlobalCOO && !isCreator) {
        return NextResponse.json(
          {
            error:
              "Esta tarefa exige aprovação formal de conclusão. Altere o estado para 'AGUARDANDO_REVISAO' para submeter a entrega.",
          },
          { status: 400 }
        );
      }
    }

    // Regra de Dependência: Se tentar colocar em andamento ou concluir mas existem tarefas precedentes não concluídas
    if ((targetStatus === "EM_ANDAMENTO" || targetStatus === "CONCLUIDA") && task.predecessorDependencies.length > 0) {
      const incompletePredecessors = task.predecessorDependencies.filter(
        (dep) => dep.predecessor.status !== "CONCLUIDA"
      );

      if (incompletePredecessors.length > 0 && targetStatus === "CONCLUIDA") {
        const names = incompletePredecessors.map((p) => `#${p.predecessor.taskNumber} ${p.predecessor.title}`).join(", ");
        return NextResponse.json(
          {
            error: `Não é possível concluir: Existem dependências pendentes de conclusão (${names}).`,
          },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      status: targetStatus,
    };

    if (targetStatus === "EM_ANDAMENTO" && !task.actualStartDate) {
      updateData.actualStartDate = now;
    }

    if (targetStatus === "CONCLUIDA") {
      updateData.completedAt = now;
    } else if (task.status === "CONCLUIDA" && targetStatus !== "CONCLUIDA") {
      updateData.completedAt = null;
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id },
        data: updateData,
      });

      // Gravar histórico
      await tx.taskStatusHistory.create({
        data: {
          taskId: id,
          oldStatus: task.status,
          newStatus: targetStatus,
          reason: reason || null,
          changedById: user.userId,
        },
      });

      // Se passou para AGUARDANDO_REVISAO, criar registro de aprovação para o criador/COO
      if (targetStatus === "AGUARDANDO_REVISAO") {
        const alreadyPending = await tx.approval.findFirst({
          where: { taskId: id, status: "PENDENTE" },
        });
        if (!alreadyPending) {
          await tx.approval.create({
            data: {
              taskId: id,
              requestedById: user.userId,
              reviewerById: task.createdById,
              status: "PENDENTE",
            },
          });
        }

        // Notificar quem pode aprovar: criador da tarefa e COO(s)
        const cooUsers = await tx.user.findMany({
          where: { isActive: true, roles: { some: { role: { name: "COO" } } } },
          select: { id: true },
        });
        const reviewerIds = new Set([task.createdById, ...cooUsers.map((u) => u.id)]);
        reviewerIds.delete(user.userId);
        for (const reviewerId of reviewerIds) {
          await tx.notification.create({
            data: {
              userId: reviewerId,
              title: "Entrega submetida para aprovação",
              message: `${user.name} submeteu a tarefa "${task.title}" para aprovação.`,
              category: "APPROVAL_REQUEST",
              link: "/approvals",
            },
          });
        }
      }

      // Se foi bloqueada, notificar o criador
      if (targetStatus === "BLOQUEADA") {
        await tx.notification.create({
          data: {
            userId: task.createdById,
            title: "Tarefa BLOQUEADA",
            message: `A tarefa "${task.title}" foi marcada como BLOQUEADA. Motivo: ${reason || "Não especificado"}`,
            category: "TASK_BLOCKED",
            link: `/tasks/${task.id}`,
          },
        });
      }

      return updated;
    });

    await logAudit({
      userId: user.userId,
      action: "UPDATE",
      entity: "Task",
      entityId: id,
      details: { oldStatus: task.status, newStatus: targetStatus, reason },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Erro ao alterar estado da tarefa:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

