import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canApproveTask, isExecutive } from "@/lib/rbac";

// Fila de aprovação: toda tarefa submetida (AGUARDANDO_REVISAO) aparece aqui
// até ser aprovada ou devolvida para ajustes.
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { status: "AGUARDANDO_REVISAO" };

    // Executivos enxergam toda a fila; demais usuários apenas o que criaram, submeteram ou executam
    if (!isExecutive(user)) {
      where.OR = [
        { createdById: user.userId },
        { assignedToId: user.userId },
        { approvals: { some: { requestedById: user.userId, status: "PENDENTE" } } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, title: true, initials: true } },
        createdBy: { select: { id: true, name: true, title: true } },
        department: { select: { id: true, name: true, code: true } },
        project: { select: { id: true, name: true, code: true } },
        checklistItems: { select: { id: true, isCompleted: true } },
        approvals: {
          where: { status: "PENDENTE" },
          include: { requestedBy: { select: { id: true, name: true } } },
          orderBy: { requestedAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ updatedAt: "asc" }],
    });

    const items = tasks.map((t) => {
      const pending = t.approvals[0];
      return {
        id: t.id,
        taskNumber: t.taskNumber,
        title: t.title,
        description: t.description,
        completionCriteria: t.completionCriteria,
        priority: t.priority,
        dueDate: t.dueDate,
        requiresApproval: t.requiresApproval,
        assignedTo: t.assignedTo,
        createdBy: t.createdBy,
        department: t.department,
        project: t.project,
        checklistTotal: t.checklistItems.length,
        checklistDone: t.checklistItems.filter((i) => i.isCompleted).length,
        submittedAt: pending?.requestedAt ?? t.updatedAt,
        submittedBy: pending?.requestedBy ?? t.assignedTo ?? null,
        canApprove: canApproveTask(user, t),
      };
    });

    return NextResponse.json({
      items,
      count: items.length,
      myPendingCount: items.filter((i) => i.canApprove).length,
    });
  } catch (error) {
    console.error("Erro ao listar aprovações:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
