import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isExecutive } from "@/lib/rbac";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      include: {
        lead: { select: { id: true, name: true, title: true, initials: true } },
        department: true,
        milestones: { orderBy: { dueDate: "asc" } },
        tasks: {
          select: {
            id: true,
            taskNumber: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignedTo: { select: { name: true, initials: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Erro ao listar projetos:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isExecutive(user)) {
      return NextResponse.json(
        { error: "Apenas membros da diretoria executiva podem criar novos projetos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, code, description, priority = "ALTA", budgetEstimated, leadId, departmentId, startDate, targetEndDate } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Nome e código do projeto são obrigatórios" }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        code: code.toUpperCase().trim(),
        description: description || null,
        priority,
        budgetEstimated: budgetEstimated ? parseFloat(budgetEstimated) : null,
        leadId: leadId || user.userId,
        departmentId: departmentId || null,
        startDate: startDate ? new Date(startDate) : null,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
      },
    });

    await logAudit({
      userId: user.userId,
      action: "CREATE",
      entity: "Project",
      entityId: project.id,
      details: { name, code },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar projeto:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

