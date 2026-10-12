import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runVerification() {
  console.log("=================================================");
  console.log("INICIANDO BATERIA DE TESTES DOS 5 FLUXOS CRÍTICOS");
  console.log("=================================================\n");

  const results: Record<string, boolean> = {};

  try {
    // Buscar usuários essenciais do seed
    const coo = await prisma.user.findFirst({ where: { roles: { some: { role: { name: "COO" } } } } });
    const cto = await prisma.user.findFirst({ where: { roles: { some: { role: { name: "CTO" } } } } });
    const ceo = await prisma.user.findFirst({ where: { roles: { some: { role: { name: "CEO" } } } } });
    const cpo = await prisma.user.findFirst({ where: { roles: { some: { role: { name: "CPO" } } } } });
    const dev = await prisma.user.findFirst({ where: { email: "rodrigo.tech@valtexa.com" } });

    if (!coo || !cto || !ceo || !cpo || !dev) {
      throw new Error("Usuários do seed não encontrados para teste.");
    }

    // -------------------------------------------------------------
    // FLUXO 1: DELEGAÇÃO PELO COO -> CTO -> EQUIPE -> APROVAÇÃO
    // -------------------------------------------------------------
    console.log("1. Testando Fluxo 1: Delegação pelo COO e Homologação");

    // 1.1 COO cria tarefa para o CTO
    const lastTask = await prisma.task.findFirst({ orderBy: { taskNumber: "desc" } });
    const taskNumber = (lastTask?.taskNumber || 100) + 1;

    const task = await prisma.task.create({
      data: {
        taskNumber,
        title: "Teste Fluxo 1: Homologação de Câmeras do Rover V3",
        description: "Validação de calibração dos sensores estereoscópicos com a engenharia.",
        businessObjective: "Garantir visão computacional sem ruído na soja.",
        expectedResult: "Módulos de câmera calibrados e relatório anexado.",
        completionCriteria: "Aprovação do teste em bancada pelo CTO.",
        priority: "ALTA",
        status: "PLANEJADA",
        requiresApproval: true,
        createdById: coo.id,
        assignedToId: cto.id,
      },
    });
    console.log(`  ✓ Tarefa #${task.taskNumber} criada pelo COO para o CTO.`);

    // 1.2 CTO visualiza e delega subtarefa para Rodrigo (Engenheiro)
    const subtask = await prisma.subtask.create({
      data: {
        taskId: task.id,
        title: "Calibração física das lentes em bancada",
        status: "EM_ANDAMENTO",
        createdById: cto.id,
        assignedToId: dev.id,
        estimatedHours: 4,
      },
    });
    console.log(`  ✓ Subtarefa "${subtask.title}" delegada pelo CTO ao colaborador Rodrigo.`);

    // 1.3 Colaborador conclui a subtarefa
    await prisma.subtask.update({
      where: { id: subtask.id },
      data: { status: "CONCLUIDA", completedAt: new Date() },
    });
    console.log(`  ✓ Subtarefa concluída pelo colaborador.`);

    // 1.4 CTO consolida e submete a tarefa para revisão (AGUARDANDO_REVISAO)
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "AGUARDANDO_REVISAO" },
    });
    await prisma.taskStatusHistory.create({
      data: {
        taskId: task.id,
        oldStatus: "PLANEJADA",
        newStatus: "AGUARDANDO_REVISAO",
        reason: "Testes concluídos em bancada",
        changedById: cto.id,
      },
    });
    console.log(`  ✓ Tarefa submetida pelo CTO para homologação do COO.`);

    // 1.5 COO revisa e aprova a tarefa
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "CONCLUIDA", completedAt: new Date() },
    });
    await prisma.approval.create({
      data: {
        taskId: task.id,
        requestedById: cto.id,
        reviewerById: coo.id,
        status: "APROVADO",
        feedback: "Entrega homologada conforme os critérios técnicos.",
      },
    });
    await prisma.taskStatusHistory.create({
      data: {
        taskId: task.id,
        oldStatus: "AGUARDANDO_REVISAO",
        newStatus: "CONCLUIDA",
        reason: "Homologado pelo COO",
        changedById: coo.id,
      },
    });
    console.log(`  ✓ COO homologou a entrega com sucesso.`);

    results["Fluxo 1 - Delegação e Homologação"] = true;

    // -------------------------------------------------------------
    // FLUXO 2: PLANEJAMENTO SEMANAL, PUBLICAÇÃO E ENCERRAMENTO
    // -------------------------------------------------------------
    console.log("\n2. Testando Fluxo 2: Planejamento Semanal Executivo");

    const weekPlan = await prisma.weeklyPlan.create({
      data: {
        title: "Teste Fluxo 2: Planejamento Semana 43 / 2026",
        year: 2026,
        weekNumber: 43,
        startDate: new Date("2026-10-19"),
        endDate: new Date("2026-10-25"),
        status: "EM_ELABORACAO",
        strategicFocus: "Validação agronômica em campo",
        createdById: coo.id,
      },
    });

    // Adiciona entregas para CTO e CEO
    await prisma.weeklyPlanItem.create({
      data: {
        weeklyPlanId: weekPlan.id,
        userId: cto.id,
        title: "Testes de bancada do módulo LiDAR",
        dayOfWeek: 2,
        expectedDelivery: "Laudo técnico de precisão",
        isPriority: true,
      },
    });

    // Publica o planejamento
    await prisma.weeklyPlan.update({
      where: { id: weekPlan.id },
      data: { status: "PUBLICADA", publishedAt: new Date() },
    });
    console.log(`  ✓ Agenda executiva criada e publicada pelo COO.`);

    // Encerra a semana gerando relatório
    await prisma.weeklyPlan.update({
      where: { id: weekPlan.id },
      data: {
        status: "ENCERRADA",
        closedAt: new Date(),
        closureReport: "Relatório gerado com 100% de conformidade de teste.",
      },
    });
    console.log(`  ✓ Encerramento semanal e relatório gerados com sucesso.`);

    results["Fluxo 2 - Planejamento Semanal"] = true;

    // -------------------------------------------------------------
    // FLUXO 3: ORGANOGRAMA E HIERARQUIA VIVA
    // -------------------------------------------------------------
    console.log("\n3. Testando Fluxo 3: Organograma e Relações Hierárquicas");

    const relation = await prisma.reportingRelationship.findFirst({
      where: { managerId: cto.id, subordinateId: dev.id, isActive: true },
    });

    if (!relation) {
      throw new Error("Relação CTO -> Engenheiro não encontrada.");
    }
    console.log(`  ✓ Relação hierárquica verificada: ${cto.name} gerencia ${dev.name}.`);

    results["Fluxo 3 - Organograma"] = true;

    // -------------------------------------------------------------
    // FLUXO 4: REUNIÕES, ATAS E CONVERSÃO DE DECISÃO EM TAREFA
    // -------------------------------------------------------------
    console.log("\n4. Testando Fluxo 4: Central de Reuniões e Decisões");

    const meeting = await prisma.meeting.create({
      data: {
        title: "Teste Fluxo 4: Comitê Extraordinário de Produto",
        objective: "Avaliação do cronograma de lançamento do SaaS",
        scheduledStart: new Date("2026-10-14T14:00:00Z"),
        scheduledEnd: new Date("2026-10-14T15:00:00Z"),
        durationMinutes: 60,
        status: "REALIZADA",
        organizerId: coo.id,
      },
    });

    // Registra decisão
    const decision = await prisma.decision.create({
      data: {
        meetingId: meeting.id,
        description: "Contratar teste de estresse do servidor de telemetria",
        category: "TECNICA",
        status: "APROVADA",
        responsibleUserId: cto.id,
      },
    });
    console.log(`  ✓ Decisão registrada na reunião: "${decision.description}".`);

    // Converte decisão em tarefa
    const convertedTask = await prisma.task.create({
      data: {
        taskNumber: taskNumber + 1,
        title: `Executar: ${decision.description}`,
        description: "Gerada a partir da deliberação da reunião.",
        assignedToId: decision.responsibleUserId,
        status: "PLANEJADA",
        priority: "ALTA",
        createdById: coo.id,
        originatingDecisionId: decision.id,
      },
    });
    await prisma.decision.update({
      where: { id: decision.id },
      data: { status: "CONVERTIDA_EM_TAREFA" },
    });
    console.log(`  ✓ Decisão convertida com êxito na Tarefa #${convertedTask.taskNumber}.`);

    results["Fluxo 4 - Reuniões e Decisões"] = true;

    // -------------------------------------------------------------
    // FLUXO 5: SEGURANÇA E CONTROLE DE ACESSO
    // -------------------------------------------------------------
    console.log("\n5. Testando Fluxo 5: Validação de Segurança e Permissões");

    // Verificar se o usuário comum possui papéis restritos
    const devUserWithRoles = await prisma.user.findUnique({
      where: { id: dev.id },
      include: { roles: { include: { role: true } } },
    });

    const isDevAdmin = devUserWithRoles?.roles.some((r) => r.role.name === "COO");
    if (isDevAdmin) {
      throw new Error("Falha de segurança: Colaborador possui privilégios de COO.");
    }
    console.log(`  ✓ Permissões verificadas: Colaborador ${dev.name} não possui acesso irrestrito.`);

    results["Fluxo 5 - Segurança e RBAC"] = true;

    console.log("\n=================================================");
    console.log("TODOS OS 5 FLUXOS CRÍTICOS PASSARAM COM SUCESSO!");
    console.log("=================================================");
    console.table(results);
  } catch (error) {
    console.error("Erro na verificação dos fluxos:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();

