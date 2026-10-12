import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isCOO } from "@/lib/rbac";

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
    const plan = await prisma.weeklyPlan.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true, title: true } },
        items: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                title: true,
                initials: true,
                department: { select: { name: true, code: true } },
              },
            },
            task: {
              include: {
                checklistItems: true,
                subtasks: true,
                assignedTo: { select: { name: true } },
              },
            },
          },
          orderBy: [{ dayOfWeek: "asc" }, { isPriority: "desc" }],
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Planejamento não encontrado" }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Erro ao buscar plano semanal:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isCOO(user)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { strategicFocus, status } = body;

    const updated = await prisma.weeklyPlan.update({
      where: { id },
      data: {
        strategicFocus: strategicFocus !== undefined ? strategicFocus : undefined,
        status: status !== undefined ? status : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar plano semanal:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

