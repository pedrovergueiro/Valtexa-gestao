import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isCOO, isExecutive } from "@/lib/rbac";

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

    // Permissão: COO pode editar qualquer tarefa; criador ou executivo do setor pode editar
    const hasPermission =
      isCOO(user) ||
      existing.createdById === user.userId ||
      (isExecutive(user) && user.departmentId === existing.departmentId);

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Sem autorização para alterar esta tarefa" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      businessObjective,
      expectedResult,
      assignedToId,
      departmentId,
      startDate,
      dueDate,
      priority,
      criticalReason,
      projectId,
      completionCriteria,
      referenceLinks,
      requiresApproval,
      notesRestrictions,
      estimatedHours,
      businessImpact,
    } = body;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        description: description ?? existing.description,
        businessObjective: businessObjective ?? existing.businessObjective,
        expectedResult: expectedResult ?? existing.expectedResult,
        assignedToId: assignedToId ?? existing.assignedToId,
        departmentId: departmentId ?? existing.departmentId,
        startDate: startDate ? new Date(startDate) : existing.startDate,
        dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
        priority: priority ?? existing.priority,
        criticalReason: criticalReason ?? existing.criticalReason,
        projectId: projectId ?? existing.projectId,
        completionCriteria: completionCriteria ?? existing.completionCriteria,
        referenceLinks: referenceLinks ? (typeof referenceLinks === "string" ? referenceLinks : JSON.stringify(referenceLinks)) : existing.referenceLinks,
        requiresApproval: requiresApproval !== undefined ? !!requiresApproval : existing.requiresApproval,
        notesRestrictions: notesRestrictions ?? existing.notesRestrictions,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : existing.estimatedHours,
        businessImpact: businessImpact ?? existing.businessImpact,
      },
    });

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

