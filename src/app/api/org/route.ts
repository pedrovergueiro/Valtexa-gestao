import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isCOO } from "@/lib/rbac";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const now = new Date();

    // Buscar usuários ativos com suas tarefas e departamentos
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        department: true,
        roles: { include: { role: true } },
        managers: {
          where: { isActive: true },
          include: { manager: { select: { id: true, name: true, title: true } } },
        },
        subordinates: {
          where: { isActive: true },
          include: { subordinate: { select: { id: true, name: true, title: true } } },
        },
        assignedTasks: {
          where: {
            status: { in: ["PLANEJADA", "EM_ANDAMENTO", "BLOQUEADA", "AGUARDANDO_REVISAO", "AJUSTES_SOLICITADOS"] },
          },
          select: { id: true, status: true, dueDate: true, priority: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const enrichedUsers = users.map((u) => {
      const activeTasks = u.assignedTasks.length;
      const delayedTasks = u.assignedTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < now
      ).length;

      const primaryManager = u.managers[0]?.manager || null;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        title: u.title,
        initials: u.initials || u.name.split(" ").map((n) => n[0]).slice(0, 2).join(""),
        department: u.department ? {
          id: u.department.id,
          name: u.department.name,
          code: u.department.code,
          color: u.department.color,
        } : null,
        roles: u.roles.map((r) => r.role.name),
        manager: primaryManager,
        subordinatesCount: u.subordinates.length,
        subordinateIds: u.subordinates.map((s) => s.subordinate.id),
        activeTasksCount: activeTasks,
        delayedTasksCount: delayedTasks,
        status: delayedTasks > 0 ? "ATENCAO" : activeTasks > 5 ? "SOBRECARREGADO" : "NORMAL",
      };
    });

    // Departamentos para agrupamento e filtros
    const departments = await prisma.department.findMany({
      include: {
        _count: { select: { members: true, tasks: true, projects: true } },
      },
    });

    return NextResponse.json({
      users: enrichedUsers,
      departments,
    });
  } catch (error) {
    console.error("Erro ao carregar organograma:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isCOO(user)) {
      return NextResponse.json(
        { error: "Apenas o COO pode alterar a estrutura hierárquica e organograma" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { managerId, subordinateId, relationshipType = "DIRECT", notes } = body;

    if (!managerId || !subordinateId) {
      return NextResponse.json(
        { error: "Líder (managerId) e liderado (subordinateId) são obrigatórios" },
        { status: 400 }
      );
    }

    if (managerId === subordinateId) {
      return NextResponse.json(
        { error: "Um colaborador não pode ser líder de si mesmo" },
        { status: 400 }
      );
    }

    // Desativar relação anterior direta se houver
    await prisma.reportingRelationship.updateMany({
      where: { subordinateId, isActive: true },
      data: { isActive: false, endDate: new Date() },
    });

    const newRelation = await prisma.reportingRelationship.create({
      data: {
        managerId,
        subordinateId,
        relationshipType,
        notes: notes || null,
        isActive: true,
      },
    });

    await logAudit({
      userId: user.userId,
      action: "UPDATE",
      entity: "ReportingRelationship",
      entityId: newRelation.id,
      details: { managerId, subordinateId, relationshipType },
    });

    return NextResponse.json(newRelation, { status: 201 });
  } catch (error) {
    console.error("Erro ao salvar relação hierárquica:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

