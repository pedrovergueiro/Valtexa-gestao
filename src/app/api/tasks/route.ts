import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isCOO, isExecutive } from "@/lib/rbac";

const OPEN_STATUSES = [
  "RASCUNHO",
  "PLANEJADA",
  "AGUARDANDO_INICIO",
  "EM_ANDAMENTO",
  "BLOQUEADA",
  "AGUARDANDO_REVISAO",
  "AJUSTES_SOLICITADOS",
];

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const departmentId = searchParams.get("departmentId");
    const assignedToId = searchParams.get("assignedToId");
    const projectId = searchParams.get("projectId");
    const search = searchParams.get("search");

    // Construção segura de filtros
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const and: any[] = [];

    // Filtros virtuais usados pelos cards do painel executivo
    if (status === "ABERTAS") {
      where.status = { in: OPEN_STATUSES };
    } else if (status === "ATRASADAS") {
      where.status = { in: OPEN_STATUSES };
      where.dueDate = { lt: new Date() };
    } else if (status && status !== "ALL") {
      where.status = status;
    }
    if (priority && priority !== "ALL") where.priority = priority;
    if (departmentId && departmentId !== "ALL") where.departmentId = departmentId;
    if (assignedToId && assignedToId !== "ALL") where.assignedToId = assignedToId;
    if (projectId && projectId !== "ALL") where.projectId = projectId;

    if (search) {
      and.push({
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
          { businessObjective: { contains: search } },
          { completionCriteria: { contains: search } },
        ],
      });
    }

    // Se o usuário não for executivo ou COO, ele só pode ver tarefas atribuídas a ele, às quais ele participa ou do seu departamento
    if (!isExecutive(user)) {
      and.push({
        OR: [
          { assignedToId: user.userId },
          { createdById: user.userId },
          { assignees: { some: { userId: user.userId } } },
          { departmentId: user.departmentId },
        ],
      });
    }

    if (and.length > 0) where.AND = and;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, title: true, email: true, initials: true } },
        createdBy: { select: { id: true, name: true, title: true, email: true } },
        department: { select: { id: true, name: true, code: true, color: true } },
        project: { select: { id: true, name: true, code: true } },
        checklistItems: { orderBy: { position: "asc" } },
        subtasks: {
          include: {
            assignedTo: { select: { id: true, name: true, title: true } },
          },
        },
        assignees: {
          include: {
            user: { select: { id: true, name: true, title: true } },
          },
        },
        predecessorDependencies: {
          include: {
            predecessor: { select: { id: true, taskNumber: true, title: true, status: true } },
          },
        },
      },
      orderBy: [
        { priority: "asc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Erro ao listar tarefas:", error);
    return NextResponse.json({ error: "Erro interno ao listar tarefas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
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
      priority = "MEDIA",
      criticalReason,
      projectId,
      checklist = [],
      completionCriteria,
      referenceLinks,
      requiresApproval = false,
      notesRestrictions,
      estimatedHours,
      businessImpact,
      predecessorTaskIds = [],
    } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Título e descrição completa são obrigatórios" },
        { status: 400 }
      );
    }

    if (priority === "CRITICA" && !criticalReason) {
      return NextResponse.json(
        { error: "Tarefas de prioridade Crítica exigem justificativa obrigatória" },
        { status: 400 }
      );
    }

    // Obter próximo número sequencial
    const lastTask = await prisma.task.findFirst({
      orderBy: { taskNumber: "desc" },
      select: { taskNumber: true },
    });
    const nextTaskNumber = (lastTask?.taskNumber || 100) + 1;

    // Criar tarefa com checklist e dependências em transação
    const newTask = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          taskNumber: nextTaskNumber,
          title,
          description,
          businessObjective: businessObjective || null,
          expectedResult: expectedResult || null,
          assignedToId: assignedToId || null,
          departmentId: departmentId || null,
          startDate: startDate ? new Date(startDate) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          priority,
          criticalReason: criticalReason || null,
          projectId: projectId || null,
          completionCriteria: completionCriteria || null,
          referenceLinks: referenceLinks ? (typeof referenceLinks === "string" ? referenceLinks : JSON.stringify(referenceLinks)) : null,
          requiresApproval: !!requiresApproval,
          notesRestrictions: notesRestrictions || null,
          estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
          businessImpact: businessImpact || null,
          status: "PLANEJADA",
          createdById: user.userId,
        },
      });

      // Itens de checklist
      if (Array.isArray(checklist) && checklist.length > 0) {
        for (let i = 0; i < checklist.length; i++) {
          const item = checklist[i];
          const itemTitle = typeof item === "string" ? item : item.title;
          if (itemTitle && itemTitle.trim()) {
            await tx.checklistItem.create({
              data: {
                taskId: task.id,
                title: itemTitle.trim(),
                position: i + 1,
              },
            });
          }
        }
      }

      // Dependências
      if (Array.isArray(predecessorTaskIds) && predecessorTaskIds.length > 0) {
        for (const predId of predecessorTaskIds) {
          if (predId && predId !== task.id) {
            await tx.taskDependency.create({
              data: {
                predecessorId: predId,
                successorId: task.id,
              },
            });
          }
        }
      }

      // Log inicial de status
      await tx.taskStatusHistory.create({
        data: {
          taskId: task.id,
          oldStatus: "CRIACAO",
          newStatus: "PLANEJADA",
          reason: "Criação da tarefa",
          changedById: user.userId,
        },
      });

      // Notificação ao responsável
      if (assignedToId && assignedToId !== user.userId) {
        await tx.notification.create({
          data: {
            userId: assignedToId,
            title: "Nova tarefa atribuída",
            message: `${user.name} atribuiu a você a tarefa: "${title}"`,
            category: "TASK_ASSIGNED",
            link: `/tasks/${task.id}`,
          },
        });
      }

      return task;
    });

    // Auditoria
    await logAudit({
      userId: user.userId,
      action: "CREATE",
      entity: "Task",
      entityId: newTask.id,
      details: { title, assignedToId, priority, taskNumber: nextTaskNumber },
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar tarefa:", error);
    return NextResponse.json({ error: "Erro interno ao criar tarefa" }, { status: 500 });
  }
}

