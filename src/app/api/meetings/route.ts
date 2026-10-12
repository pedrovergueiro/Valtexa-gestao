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

    const meetings = await prisma.meeting.findMany({
      include: {
        organizer: { select: { id: true, name: true, title: true, initials: true } },
        participants: {
          include: { user: { select: { id: true, name: true, title: true, initials: true } } },
        },
        agendaItems: { orderBy: { position: "asc" } },
        decisions: {
          include: {
            responsibleUser: { select: { id: true, name: true } },
            resultingTasks: { select: { id: true, taskNumber: true, title: true, status: true } },
          },
        },
      },
      orderBy: { scheduledStart: "desc" },
    });

    return NextResponse.json(meetings);
  } catch (error) {
    console.error("Erro ao listar reuniões:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
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
      meetingType = "LIDERANCA_SEMANAL",
      objective,
      scheduledStart,
      scheduledEnd,
      durationMinutes = 60,
      locationOrUrl,
      participantUserIds = [],
      agendaItems = [],
      autoGenerateSmartAgenda = false,
    } = body;

    if (!title || !objective || !scheduledStart) {
      return NextResponse.json(
        { error: "Título, objetivo e data/horário são obrigatórios" },
        { status: 400 }
      );
    }

    // Se solicitado gerar pauta inteligente baseada nos dados reais do sistema
    let finalAgenda = [...agendaItems];
    if (autoGenerateSmartAgenda) {
      const now = new Date();
      const delayedTasks = await prisma.task.findMany({
        where: {
          status: { in: ["PLANEJADA", "EM_ANDAMENTO", "BLOQUEADA"] },
          dueDate: { lt: now },
        },
        include: { assignedTo: true, department: true },
        take: 4,
      });

      const blockedTasks = await prisma.task.findMany({
        where: { status: "BLOQUEADA" },
        include: { assignedTo: true },
        take: 3,
      });

      const reviewTasks = await prisma.task.findMany({
        where: { status: "AGUARDANDO_REVISAO" },
        include: { assignedTo: true },
        take: 3,
      });

      finalAgenda = [
        {
          position: 1,
          title: "COO: Planejamento Operacional e Eficiência da Liderança",
          speaker: "COO",
          description: `Acompanhamento do status geral da empresa e alinhamento de prioridades.`,
          durationMin: 20,
        },
        {
          position: 2,
          title: "CEO: Negócios, Parcerias com Cooperativas e Rodada Seed",
          speaker: "CEO",
          description: `Avanço comercial e cronograma de acesso às fazendas experimentais.`,
          durationMin: 20,
        },
        {
          position: 3,
          title: "CTO: Engenharia, IA e Status de Validação do ValTexa Rover V3",
          speaker: "CTO",
          description: `Relatório de testes técnicos e componentes críticos de hardware.`,
          durationMin: 25,
        },
        {
          position: 4,
          title: "CPO: Requisitos de Telemetria, Usabilidade e Roadmap de Produto",
          speaker: "CPO",
          description: `Feedback dos protótipos de campo e requisitos da interface do produtor.`,
          durationMin: 15,
        },
        {
          position: 5,
          title: "Deliberações: Análise de Riscos, Tarefas Bloqueadas e Decisões",
          speaker: "TODOS",
          description: `Atrasadas: ${delayedTasks.length} | Bloqueadas: ${blockedTasks.length} | Em revisão: ${reviewTasks.length}`,
          durationMin: 10,
        },
      ];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meeting = await prisma.$transaction(async (tx: any) => {
      const m = await tx.meeting.create({
        data: {
          title,
          meetingType,
          objective,
          scheduledStart: new Date(scheduledStart),
          scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : new Date(new Date(scheduledStart).getTime() + durationMinutes * 60000),
          durationMinutes: parseInt(durationMinutes),
          locationOrUrl: locationOrUrl || "Sala de Governança / Google Meet",
          organizerId: user.userId,
          status: "AGENDADA",
        },
      });

      // Incluir organizador e participantes
      const allParticipants = Array.from(new Set([user.userId, ...participantUserIds]));
      for (const pId of allParticipants) {
        if (pId) {
          await tx.meetingParticipant.create({
            data: {
              meetingId: m.id,
              userId: pId,
              role: pId === user.userId ? "ORGANIZER" : "PARTICIPANT",
            },
          });

          if (pId !== user.userId) {
            await tx.notification.create({
              data: {
                userId: pId,
                title: "Convocação para Reunião",
                message: `${user.name} convocou você para: "${title}" em ${new Date(scheduledStart).toLocaleDateString("pt-BR")}.`,
                category: "MEETING",
                link: `/meetings/${m.id}`,
              },
            });
          }
        }
      }

      // Adicionar pauta
      for (let i = 0; i < finalAgenda.length; i++) {
        const item = finalAgenda[i];
        await tx.meetingAgendaItem.create({
          data: {
            meetingId: m.id,
            position: i + 1,
            title: item.title,
            speaker: item.speaker || null,
            description: item.description || null,
            durationMin: item.durationMin ? parseInt(item.durationMin) : null,
          },
        });
      }

      return m;
    });

    await logAudit({
      userId: user.userId,
      action: "CREATE",
      entity: "Meeting",
      entityId: meeting.id,
      details: { title, meetingType, scheduledStart },
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error("Erro ao agendar reunião:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

