import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const now = new Date();

    // 1. Tarefas totais e status
    const allTasks = await prisma.task.findMany({
      include: {
        department: true,
        assignedTo: { select: { id: true, name: true, title: true, initials: true } },
        project: { select: { id: true, name: true, code: true } },
      },
    });

    const openStatuses = ["RASCUNHO", "PLANEJADA", "AGUARDANDO_INICIO", "EM_ANDAMENTO", "BLOQUEADA", "AGUARDANDO_REVISAO", "AJUSTES_SOLICITADOS"];
    const openTasks = allTasks.filter((t) => openStatuses.includes(t.status));
    const completedTasks = allTasks.filter((t) => t.status === "CONCLUIDA");
    const blockedTasks = allTasks.filter((t) => t.status === "BLOQUEADA");
    const reviewTasks = allTasks.filter((t) => t.status === "AGUARDANDO_REVISAO");

    // Atrasadas: abertas com dueDate < now
    const delayedTasks = openTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now
    );

    // 2. Cumprimento de prazo (On-time completion)
    const completedWithDueDate = completedTasks.filter((t) => t.dueDate && t.completedAt);
    const completedOnTime = completedWithDueDate.filter(
      (t) => new Date(t.completedAt!) <= new Date(t.dueDate!)
    );
    const onTimeRate =
      completedWithDueDate.length > 0
        ? Math.round((completedOnTime.length / completedWithDueDate.length) * 100)
        : null;

    // 3. Tempo médio de conclusão (em horas/dias)
    const tasksWithDuration = completedTasks.filter((t) => t.actualStartDate && t.completedAt);
    let avgCompletionDays: number | null = null;
    if (tasksWithDuration.length > 0) {
      const totalMs = tasksWithDuration.reduce((acc, t) => {
        return acc + (new Date(t.completedAt!).getTime() - new Date(t.actualStartDate!).getTime());
      }, 0);
      avgCompletionDays = parseFloat((totalMs / (tasksWithDuration.length * 1000 * 60 * 60 * 24)).toFixed(1));
    }

    // 4. Distribuição por Setor
    const departments = await prisma.department.findMany({
      include: {
        tasks: true,
      },
    });

    const sectorDistribution = departments.map((d) => {
      const deptTasks = allTasks.filter((t) => t.departmentId === d.id);
      const deptOpen = deptTasks.filter((t) => openStatuses.includes(t.status)).length;
      const deptCompleted = deptTasks.filter((t) => t.status === "CONCLUIDA").length;
      const deptDelayed = deptTasks.filter((t) => openStatuses.includes(t.status) && t.dueDate && new Date(t.dueDate) < now).length;
      return {
        id: d.id,
        name: d.name,
        code: d.code,
        color: d.color,
        total: deptTasks.length,
        open: deptOpen,
        completed: deptCompleted,
        delayed: deptDelayed,
      };
    });

    // 5. Carga de Trabalho por Responsável
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        title: true,
        initials: true,
        assignedTasks: {
          select: {
            id: true,
            status: true,
            priority: true,
            estimatedHours: true,
            dueDate: true,
          },
        },
      },
    });

    const workloadByUser = users.map((u) => {
      const active = u.assignedTasks.filter((t) => openStatuses.includes(t.status));
      const totalEstimatedHours = active.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
      const delayed = active.filter((t) => t.dueDate && new Date(t.dueDate) < now).length;
      return {
        id: u.id,
        name: u.name,
        title: u.title,
        initials: u.initials,
        activeTasksCount: active.length,
        totalEstimatedHours,
        delayedTasksCount: delayed,
      };
    });

    // 6. Agenda Semanal Ativa
    const currentWeeklyPlan = await prisma.weeklyPlan.findFirst({
      where: { status: { in: ["PUBLICADA", "EM_EXECUCAO", "EM_ELABORACAO"] } },
      include: {
        items: {
          include: {
            task: { select: { id: true, status: true, dueDate: true } },
          },
        },
      },
      orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
    });

    let weeklyPlanCompletionRate: number | null = null;
    if (currentWeeklyPlan && currentWeeklyPlan.items.length > 0) {
      const totalItems = currentWeeklyPlan.items.length;
      const finishedItems = currentWeeklyPlan.items.filter(
        (i) => i.status === "CONCLUIDA" || (i.task && i.task.status === "CONCLUIDA")
      ).length;
      weeklyPlanCompletionRate = Math.round((finishedItems / totalItems) * 100);
    }

    // 7. Projetos e Marcos
    const projects = await prisma.project.findMany({
      include: {
        lead: { select: { name: true } },
        milestones: true,
        tasks: { select: { id: true, status: true } },
      },
    });

    const upcomingMilestones = await prisma.milestone.findMany({
      where: { status: "PENDENTE" },
      include: { project: { select: { name: true, code: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    });

    // 8. Tarefas por Prioridade
    const priorityDistribution = [
      { priority: "CRITICA", label: "Crítica", count: allTasks.filter((t) => t.priority === "CRITICA").length },
      { priority: "ALTA", label: "Alta", count: allTasks.filter((t) => t.priority === "ALTA").length },
      { priority: "MEDIA", label: "Média", count: allTasks.filter((t) => t.priority === "MEDIA").length },
      { priority: "BAIXA", label: "Baixa", count: allTasks.filter((t) => t.priority === "BAIXA").length },
    ];

    return NextResponse.json({
      summary: {
        totalOpenTasks: openTasks.length,
        completedTasksCount: completedTasks.length,
        delayedTasksCount: delayedTasks.length,
        blockedTasksCount: blockedTasks.length,
        reviewTasksCount: reviewTasks.length,
        totalTasksAllTime: allTasks.length,
        onTimeRate,
        onTimeDenominator: completedWithDueDate.length,
        avgCompletionDays,
        avgCompletionDenominator: tasksWithDuration.length,
        weeklyPlanCompletionRate,
        weeklyPlanDenominator: currentWeeklyPlan?.items.length || 0,
        currentWeeklyPlanTitle: currentWeeklyPlan?.title || null,
      },
      sectorDistribution,
      workloadByUser,
      priorityDistribution,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        status: p.status,
        priority: p.priority,
        leadName: p.lead?.name || "Não atribuído",
        totalTasks: p.tasks.length,
        completedTasks: p.tasks.filter((t) => t.status === "CONCLUIDA").length,
      })),
      upcomingMilestones,
      delayedTasksList: delayedTasks.map((t) => ({
        id: t.id,
        taskNumber: t.taskNumber,
        title: t.title,
        dueDate: t.dueDate,
        assignedToName: t.assignedTo?.name || "Não atribuído",
        departmentName: t.department?.name || "Sem setor",
        priority: t.priority,
      })),
    });
  } catch (error) {
    console.error("Erro ao gerar indicadores do dashboard:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

