import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { query } = await request.json();
    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Pergunta não enviada" }, { status: 400 });
    }

    const q = query.toLowerCase().trim();
    const now = new Date();

    // 1. "quais tarefas estão atrasadas?"
    if (q.includes("atrasad") || q.includes("vencid")) {
      const delayedTasks = await prisma.task.findMany({
        where: {
          status: { in: ["PLANEJADA", "EM_ANDAMENTO", "BLOQUEADA", "AGUARDANDO_REVISAO", "AJUSTES_SOLICITADOS"] },
          dueDate: { lt: now },
        },
        include: {
          assignedTo: { select: { name: true, title: true } },
          department: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
      });

      if (delayedTasks.length === 0) {
        return NextResponse.json({
          answer: "Excelente notícia: **nenhuma tarefa está atrasada** no momento em toda a empresa.",
          sources: [],
          updatedAt: now.toISOString(),
        });
      }

      const list = delayedTasks.map((t) => {
        const dueFormatted = t.dueDate ? new Date(t.dueDate).toLocaleDateString("pt-BR") : "Sem prazo";
        return `- **[#${t.taskNumber} — ${t.title}](/tasks/${t.id})** | Resp: ${t.assignedTo?.name || "Não atribuído"} | Setor: ${t.department?.name || "N/A"} | Prazo: ${dueFormatted} | Prioridade: ${t.priority}`;
      }).join("\n");

      return NextResponse.json({
        answer: `Atualmente temos **${delayedTasks.length} tarefa(s) atrasada(s)** que requerem atenção imediata da liderança:\n\n${list}`,
        sources: delayedTasks.map((t) => ({ id: t.id, title: `#${t.taskNumber} ${t.title}`, link: `/tasks/${t.id}` })),
        updatedAt: now.toISOString(),
      });
    }

    // 2. "o que o CTO precisa entregar nesta semana?"
    if (q.includes("cto") || q.includes("tecnologia") || q.includes("lucas")) {
      const ctoUser = await prisma.user.findFirst({
        where: { title: { contains: "CTO" } },
      });

      const ctoTasks = await prisma.task.findMany({
        where: {
          assignedToId: ctoUser?.id,
          status: { in: ["PLANEJADA", "EM_ANDAMENTO", "AGUARDANDO_REVISAO", "AJUSTES_SOLICITADOS"] },
        },
        include: {
          checklistItems: true,
          subtasks: { include: { assignedTo: true } },
        },
      });

      const weeklyItems = await prisma.weeklyPlanItem.findMany({
        where: { userId: ctoUser?.id },
        include: { weeklyPlan: true },
        take: 5,
      });

      const list = ctoTasks.map((t) => {
        const completedCheck = t.checklistItems.filter((c) => c.isCompleted).length;
        const totalCheck = t.checklistItems.length;
        const checkStr = totalCheck > 0 ? ` (${completedCheck}/${totalCheck} itens do checklist)` : "";
        return `- **[#${t.taskNumber} — ${t.title}](/tasks/${t.id})** [Status: ${t.status}]${checkStr}\n  *Objetivo:* ${t.businessObjective || "Não preenchido"}\n  *Subtarefas delegadas à equipe:* ${t.subtasks.length}`;
      }).join("\n\n");

      return NextResponse.json({
        answer: `As principais entregas sob responsabilidade do **CTO (${ctoUser?.name || "Lucas"})** são:\n\n${list || "Nenhuma tarefa em andamento atribuída ao CTO."}`,
        sources: ctoTasks.map((t) => ({ id: t.id, title: `#${t.taskNumber} ${t.title}`, link: `/tasks/${t.id}` })),
        updatedAt: now.toISOString(),
      });
    }

    // 3. "quais tarefas estão bloqueadas?"
    if (q.includes("bloquead") || q.includes("impedimento") || q.includes("dependênc")) {
      const blockedTasks = await prisma.task.findMany({
        where: { status: "BLOQUEADA" },
        include: {
          assignedTo: true,
          predecessorDependencies: { include: { predecessor: { include: { assignedTo: true } } } },
          comments: { where: { isBlockerReport: true } },
        },
      });

      if (blockedTasks.length === 0) {
        return NextResponse.json({
          answer: "Atualmente **não há tarefas com status BLOQUEADA** registradas no sistema.",
          sources: [],
          updatedAt: now.toISOString(),
        });
      }

      const list = blockedTasks.map((t) => {
        const deps = t.predecessorDependencies.map((d) => `Aguardando #${d.predecessor.taskNumber} (${d.predecessor.assignedTo?.name || "N/A"})`).join(", ");
        return `- **[#${t.taskNumber} — ${t.title}](/tasks/${t.id})** | Resp: ${t.assignedTo?.name || "N/A"}\n  *Causa:* ${deps || "Impedimento informado na tarefa"}`;
      }).join("\n");

      return NextResponse.json({
        answer: `Identificamos **${blockedTasks.length} tarefa(s) bloqueada(s)**:\n\n${list}`,
        sources: blockedTasks.map((t) => ({ id: t.id, title: `#${t.taskNumber} ${t.title}`, link: `/tasks/${t.id}` })),
        updatedAt: now.toISOString(),
      });
    }

    // 4. "o que precisamos discutir na próxima reunião?" ou "pauta"
    if (q.includes("reuni") || q.includes("pauta") || q.includes("discutir")) {
      const nextMeeting = await prisma.meeting.findFirst({
        where: { scheduledStart: { gte: now } },
        include: { agendaItems: { orderBy: { position: "asc" } }, participants: { include: { user: true } } },
        orderBy: { scheduledStart: "asc" },
      });

      const delayed = await prisma.task.count({
        where: { status: { in: ["PLANEJADA", "EM_ANDAMENTO"] }, dueDate: { lt: now } },
      });

      const pendingDecisions = await prisma.decision.findMany({
        where: { status: { in: ["PROPOSTA", "EM_DISCUSSAO"] } },
      });

      let agendaList = "";
      if (nextMeeting && nextMeeting.agendaItems.length > 0) {
        agendaList = nextMeeting.agendaItems.map((a) => `${a.position}. **${a.title}** (${a.speaker || "Geral"}) - ${a.description || ""}`).join("\n");
      } else {
        agendaList = `1. Planejamento Operacional do COO\n2. Parcerias e Captação com CEO\n3. Avanço técnico do Rover V3 com CTO\n4. Requisitos de produto com CPO\n5. Deliberação sobre ${delayed} tarefas com alerta de prazo e ${pendingDecisions.length} decisões pendentes.`;
      }

      return NextResponse.json({
        answer: `Pauta consolidada para alinhamento da liderança:\n\n${agendaList}`,
        sources: nextMeeting ? [{ id: nextMeeting.id, title: nextMeeting.title, link: `/meetings/${nextMeeting.id}` }] : [],
        updatedAt: now.toISOString(),
      });
    }

    // 5. "quais decisões continuam pendentes?"
    if (q.includes("decis") || q.includes("delibera")) {
      const decisions = await prisma.decision.findMany({
        include: { responsibleUser: true },
        orderBy: { decisionDate: "desc" },
        take: 6,
      });

      const list = decisions.map((d) => {
        return `- **${d.description}** [Status: ${d.status}] | Resp: ${d.responsibleUser?.name || "Não atribuído"} | Categoria: ${d.category}`;
      }).join("\n");

      return NextResponse.json({
        answer: `Registro de decisões corporativas:\n\n${list}`,
        sources: [],
        updatedAt: now.toISOString(),
      });
    }

    // 6. Resposta padrão contextualizada com visão geral real
    const stats = {
      openTasks: await prisma.task.count({ where: { status: { in: ["PLANEJADA", "EM_ANDAMENTO", "AGUARDANDO_REVISAO"] } } }),
      delayedTasks: await prisma.task.count({ where: { status: { in: ["PLANEJADA", "EM_ANDAMENTO"] }, dueDate: { lt: now } } }),
      projects: await prisma.project.count({ where: { status: "EM_ANDAMENTO" } }),
    };

    return NextResponse.json({
      answer: `Visão geral do sistema em tempo real:\n- **${stats.openTasks} tarefas abertas** em andamento nos setores.\n- **${stats.delayedTasks} tarefas atrasadas** demandando acompanhamento.\n- **${stats.projects} projetos estratégicos ativos** (ex: ValTexa Rover V3, SaaS Agrícola).\n\nVocê pode me perguntar sobre: *tarefas atrasadas*, *entregas do CTO/CEO/CPO*, *tarefas bloqueadas*, *pauta da reunião semanal* ou *decisões corporativas*.`,
      sources: [],
      updatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Erro no assistente de IA:", error);
    return NextResponse.json({ error: "Erro interno no assistente" }, { status: 500 });
  }
}
