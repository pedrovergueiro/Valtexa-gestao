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

    const plans = await prisma.weeklyPlan.findMany({
      include: {
        createdBy: { select: { name: true, title: true } },
        items: {
          include: {
            user: { select: { id: true, name: true, title: true, initials: true } },
            task: { select: { id: true, taskNumber: true, title: true, status: true, dueDate: true, priority: true } },
          },
        },
      },
      orderBy: [
        { year: "desc" },
        { weekNumber: "desc" },
      ],
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Erro ao listar planejamentos semanais:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (!isCOO(user)) {
      return NextResponse.json(
        { error: "Apenas o COO tem permissão para criar o Planejamento Semanal da liderança" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { year, weekNumber, startDate, endDate, strategicFocus, items = [] } = body;

    if (!year || !weekNumber || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Ano, número da semana, data de início e término são obrigatórios" },
        { status: 400 }
      );
    }

    const title = `Planejamento Semanal Executivo - Semana ${weekNumber} / ${year}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = await prisma.$transaction(async (tx: any) => {
      const createdPlan = await tx.weeklyPlan.create({
        data: {
          title,
          year: parseInt(year),
          weekNumber: parseInt(weekNumber),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: "EM_ELABORACAO",
          strategicFocus: strategicFocus || null,
          createdById: user.userId,
        },
      });

      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          if (item.userId && item.title) {
            await tx.weeklyPlanItem.create({
              data: {
                weeklyPlanId: createdPlan.id,
                userId: item.userId,
                taskId: item.taskId || null,
                title: item.title,
                dayOfWeek: item.dayOfWeek ? parseInt(item.dayOfWeek) : null,
                expectedDelivery: item.expectedDelivery || null,
                isPriority: !!item.isPriority,
                isRolledOver: !!item.isRolledOver,
                rolloverReason: item.rolloverReason || null,
              },
            });
          }
        }
      }

      return createdPlan;
    });

    await logAudit({
      userId: user.userId,
      action: "CREATE",
      entity: "WeeklyPlan",
      entityId: plan.id,
      details: { title, year, weekNumber },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar planejamento semanal:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

