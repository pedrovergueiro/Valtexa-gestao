import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const decision = await prisma.decision.findUnique({
      where: { id },
      include: { responsibleUser: true },
    });

    if (!decision) {
      return NextResponse.json({ error: "Decisão não encontrada" }, { status: 404 });
    }

    // Obter próximo número de tarefa
    const lastTask = await prisma.task.findFirst({
      orderBy: { taskNumber: "desc" },
      select: { taskNumber: true },
    });
    const nextTaskNumber = (lastTask?.taskNumber || 100) + 1;

    // Criar tarefa decorrente da decisão em transação
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createdTask = await prisma.$transaction(async (tx: any) => {
      const task = await tx.task.create({
        data: {
          taskNumber: nextTaskNumber,
          title: `Executar: ${decision.description.slice(0, 80)}`,
          description: `Tarefa gerada a partir da deliberação corporativa:\n\n${decision.description}\n\n**Justificativa registrada:** ${decision.rationale || "Não informada"}\n**Categoria:** ${decision.category}`,
          businessObjective: `Cumprir deliberação executiva de governança`,
          expectedResult: `Execução comprovada do que foi acordado em ata de decisão`,
          assignedToId: decision.responsibleUserId || user.userId,
          dueDate: decision.dueDate || null,
          priority: decision.category === "ESTRATEGICA" ? "ALTA" : "MEDIA",
          status: "PLANEJADA",
          createdById: user.userId,
          originatingDecisionId: decision.id,
          requiresApproval: true,
          completionCriteria: `Evidência documental de cumprimento da decisão aprovada`,
        },
      });

      // Atualizar status da decisão para CONVERTIDA_EM_TAREFA
      await tx.decision.update({
        where: { id: decision.id },
        data: { status: "CONVERTIDA_EM_TAREFA" },
      });

      // Criar item de checklist inicial
      await tx.checklistItem.create({
        data: {
          taskId: task.id,
          title: "Iniciar implementação dos termos da decisão",
          position: 1,
        },
      });

      // Notificar responsável
      if (decision.responsibleUserId && decision.responsibleUserId !== user.userId) {
        await tx.notification.create({
          data: {
            userId: decision.responsibleUserId,
            title: "Nova tarefa originada de decisão",
            message: `${user.name} converteu a decisão "${decision.description.slice(0, 50)}..." na tarefa #${nextTaskNumber}.`,
            category: "DECISION",
            link: `/tasks/${task.id}`,
          },
        });
      }

      return task;
    });

    await logAudit({
      userId: user.userId,
      action: "CREATE",
      entity: "Task",
      entityId: createdTask.id,
      details: { convertedFromDecisionId: decision.id, taskNumber: nextTaskNumber },
    });

    return NextResponse.json({ success: true, task: createdTask }, { status: 201 });
  } catch (error) {
    console.error("Erro ao converter decisão em tarefa:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

