import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isCOO } from "@/lib/rbac";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isCOO(user)) {
      return NextResponse.json(
        { error: "Apenas o COO pode publicar o planejamento semanal" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const plan = await prisma.weeklyPlan.findUnique({
      where: { id },
      include: {
        items: { include: { user: true } },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Planejamento não encontrado" }, { status: 404 });
    }

    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await prisma.$transaction(async (tx: any) => {
      const p = await tx.weeklyPlan.update({
        where: { id },
        data: {
          status: "PUBLICADA",
          publishedAt: now,
        },
      });

      // Notificar cada executivo envolvido
      const userIds = Array.from(new Set(plan.items.map((i) => i.userId)));
      for (const uId of userIds) {
        if (uId !== user.userId) {
          const count = plan.items.filter((i) => i.userId === uId).length;
          await tx.notification.create({
            data: {
              userId: uId,
              title: "Agenda Executiva Semanal Publicada",
              message: `${user.name} (COO) publicou o planejamento da Semana ${plan.weekNumber}. Você possui ${count} entregas programadas.`,
              category: "WEEKLY_PLAN",
              link: `/weekly-plan/${plan.id}`,
            },
          });
        }
      }

      return p;
    });

    await logAudit({
      userId: user.userId,
      action: "PUBLISH",
      entity: "WeeklyPlan",
      entityId: id,
      details: { weekNumber: plan.weekNumber, year: plan.year },
    });

    return NextResponse.json({ success: true, plan: updated });
  } catch (error) {
    console.error("Erro ao publicar plano semanal:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

