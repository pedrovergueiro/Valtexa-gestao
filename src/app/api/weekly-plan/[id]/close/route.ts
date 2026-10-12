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
        { error: "Apenas o COO pode encerrar o planejamento semanal" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { rolloverToNextWeek = false, nextWeekPlanId = null } = body;

    const plan = await prisma.weeklyPlan.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            user: { select: { name: true, title: true } },
            task: {
              include: {
                checklistItems: true,
                approvals: true,
                comments: { where: { isBlockerReport: true } },
              },
            },
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Planejamento não encontrado" }, { status: 404 });
    }

    // Calcular métricas reais de encerramento
    const totalItems = plan.items.length;
    let completedCount = 0;
    let inProgressCount = 0;
    let delayedCount = 0;
    let approvedDeliveriesCount = 0;
    const blockersFound: string[] = [];
    const pendingItemsToRollover: typeof plan.items = [];

    const now = new Date();

    for (const item of plan.items) {
      if (item.task) {
        if (item.task.status === "CONCLUIDA") {
          completedCount++;
        } else {
          inProgressCount++;
          if (item.task.dueDate && new Date(item.task.dueDate) < now) {
            delayedCount++;
          }
          pendingItemsToRollover.push(item);
        }

        if (item.task.approvals.some((a) => a.status === "APROVADO")) {
          approvedDeliveriesCount++;
        }

        for (const c of item.task.comments) {
          blockersFound.push(`[${item.task.title}] ${c.content}`);
        }
      } else {
        if (item.status === "CONCLUIDA") {
          completedCount++;
        } else {
          inProgressCount++;
          pendingItemsToRollover.push(item);
        }
      }
    }

    const completionRate = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

    const reportSummary = `
### Relatório de Encerramento Semanal — Semana ${plan.weekNumber} / ${plan.year}
- **Total de entregas previstas:** ${totalItems}
- **Concluídas com êxito:** ${completedCount} (${completionRate}%)
- **Em andamento / Pendentes:** ${inProgressCount}
- **Atrasadas:** ${delayedCount}
- **Entregas formalmente aprovadas:** ${approvedDeliveriesCount}
- **Impedimentos registrados:** ${blockersFound.length > 0 ? blockersFound.join("; ") : "Nenhum impedimento crítico reportado."}
- **Pendências para transferência:** ${pendingItemsToRollover.length} itens.
`.trim();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      const closedPlan = await tx.weeklyPlan.update({
        where: { id },
        data: {
          status: "ENCERRADA",
          closedAt: now,
          closureReport: reportSummary,
        },
      });

      // Se solicitado reaproveitamento para a próxima semana
      if (rolloverToNextWeek && nextWeekPlanId) {
        for (const pending of pendingItemsToRollover) {
          await tx.weeklyPlanItem.create({
            data: {
              weeklyPlanId: nextWeekPlanId,
              userId: pending.userId,
              taskId: pending.taskId,
              title: pending.title,
              dayOfWeek: pending.dayOfWeek,
              expectedDelivery: pending.expectedDelivery,
              isPriority: pending.isPriority,
              isRolledOver: true,
              rolloverReason: `Transferido da Semana ${plan.weekNumber} (não concluído no prazo)`,
            },
          });
        }
      }

      return closedPlan;
    });

    await logAudit({
      userId: user.userId,
      action: "CLOSE",
      entity: "WeeklyPlan",
      entityId: id,
      details: { weekNumber: plan.weekNumber, totalItems, completedCount, delayedCount },
    });

    return NextResponse.json({
      success: true,
      plan: result,
      closureReport: reportSummary,
      metrics: {
        totalItems,
        completedCount,
        inProgressCount,
        delayedCount,
        approvedDeliveriesCount,
        completionRate,
      },
    });
  } catch (error) {
    console.error("Erro no encerramento semanal:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

