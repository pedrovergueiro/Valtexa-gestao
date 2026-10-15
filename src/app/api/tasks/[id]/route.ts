import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canEditTask } from "@/lib/rbac";

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
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, title: true, email: true, initials: true } },
        createdBy: { select: { id: true, name: true, title: true, email: true } },
        department: true,
        project: true,
        checklistItems: {
          orderBy: { position: "asc" },
          include: { completedBy: { select: { id: true, name: true } } },
        },
        subtasks: {
          include: {
            assignedTo: { select: { id: true, name: true, title: true } },
            createdBy: { select: { id: true, name: true } },
          },
        },
        comments: {
          include: { user: { select: { id: true, name: true, title: true, initials: true } } },
          orderBy: { createdAt: "desc" },
        },
        statusHistory: {
          include: { changedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
        approvals: {
          include: {
            requestedBy: { select: { id: true, name: true } },
            reviewerBy: { select: { id: true, name: true } },
          },
          orderBy: { requestedAt: "desc" },
        },
        predecessorDependencies: {
          include: {
            predecessor: {
              select: {
                id: true,
                taskNumber: true,
                title: true,
                status: true,
                assignedTo: { select: { name: true } },
              },
            },
          },
        },
        successorDependencies: {
          include: {
            successor: {
              select: {
                id: true,
                taskNumber: true,
                title: true,
                status: true,
                assignedTo: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Erro ao buscar tarefa:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }

    // Permissão: o COO edita qualquer tarefa; demais usuários apenas as que criaram
    if (!canEditTask(user, existing)) {
      return NextResponse.json(
        { error: "Apenas o criador da tarefa ou o COO podem editá-la" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Campo omitido = mantém o valor atual; string vazia ou null = limpa o campo
    const text = (key: string, current: string | null) => {
      if (body[key] === undefined) return current;
      const v = typeof body[key] === "string" ? body[key].trim() : body[key];
      return v ? String(v) : null;
    };
    const date = (key: string, current: Date | null) => {
      if (body[key] === undefined) return current;
      return body[key] ? new Date(body[key]) : null;
    };

    const title = text("title", existing.title);
    const description = text("description", existing.description);
    if (!title || !description) {
      return NextResponse.json(
        { error: "Título e descrição completa são obrigatórios" },
        { status: 400 }
      );
    }

    const priority = body.priority ?? existing.priority;
    const criticalReason = text("criticalReason", existing.criticalReason);
    if (priority === "CRITICA" && !criticalReason) {
      return NextResponse.json(
        { error: "Tarefas de prioridade Crítica exigem justificativa obrigatória" },
        { status: 400 }
      );
    }

    let estimatedHours = existing.estimatedHours;
    if (body.estimatedHours !== undefined) {
      const parsed = parseFloat(body.estimatedHours);
      estimatedHours = Number.isFinite(parsed) ? parsed : null;
    }

    let referenceLinks = existing.referenceLinks;
    if (body.referenceLinks !== undefined) {
      referenceLinks = body.referenceLinks
        ? typeof body.referenceLinks === "string"
          ? body.referenceLinks
          : JSON.stringify(body.referenceLinks)
        : null;
    }

    const assignedToId = text("assignedToId", existing.assignedToId);

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        businessObjective: text("businessObjective", existing.businessObjective),
        expectedResult: text("expectedResult", existing.expectedResult),
        assignedToId,
        departmentId: text("departmentId", existing.departmentId),
        startDate: date("startDate", existing.startDate),
        dueDate: date("dueDate", existing.dueDate),
        priority,
        criticalReason,
        projectId: text("projectId", existing.projectId),
        completionCriteria: text("completionCriteria", existing.completionCriteria),
        referenceLinks,
        requiresApproval: body.requiresApproval !== undefined ? !!body.requiresApproval : existing.requiresApproval,
        notesRestrictions: text("notesRestrictions", existing.notesRestrictions),
        estimatedHours,
        businessImpact: text("businessImpact", existing.businessImpact),
      },
    });

    // Notificar o novo responsável quando a tarefa for reatribuída
    if (assignedToId && assignedToId !== existing.assignedToId && assignedToId !== user.userId) {
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          title: "Tarefa atribuída a você",
          message: `${user.name} atribuiu a você a tarefa: "${updatedTask.title}"`,
          category: "TASK_ASSIGNED",
          link: `/tasks/${id}`,
        },
      });
    }

    await logAudit({
      userId: user.userId,
      action: "UPDATE",
      entity: "Task",
      entityId: id,
      details: { previous: existing.title, updated: updatedTask.title },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

