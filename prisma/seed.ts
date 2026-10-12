import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do sistema corporativo ValTexa...");

  // 1. LIMPEZA SEGURA (se houver dados)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.knowledgeDocument.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.meetingAgendaItem.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.weeklyPlanItem.deleteMany();
  await prisma.weeklyPlan.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.taskStatusHistory.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.reportingRelationship.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // 2. PAPÉIS DO SISTEMA
  const roleCOO = await prisma.role.create({
    data: {
      name: "COO",
      displayName: "Chief Operating Officer",
      description: "Coordenação operacional global, planejamento executivo e acompanhamento geral",
      isSystem: true,
    },
  });

  const roleCEO = await prisma.role.create({
    data: {
      name: "CEO",
      displayName: "Chief Executive Officer",
      description: "Direção executiva, estratégia empresarial, negócios e captação",
      isSystem: true,
    },
  });

  const roleCTO = await prisma.role.create({
    data: {
      name: "CTO",
      displayName: "Chief Technology Officer",
      description: "Tecnologia, engenharia, robótica autônoma, IA e desenvolvimento técnico",
      isSystem: true,
    },
  });

  const roleCPO = await prisma.role.create({
    data: {
      name: "CPO",
      displayName: "Chief Product Officer",
      description: "Produto, requisitos, prioridades e experiência do usuário agrícola",
      isSystem: true,
    },
  });

  const roleColaborador = await prisma.role.create({
    data: {
      name: "COLABORADOR",
      displayName: "Colaborador / Especialista",
      description: "Membro da equipe executora com acesso às próprias atribuições",
      isSystem: true,
    },
  });

  // 3. DEPARTAMENTOS
  const depOps = await prisma.department.create({
    data: {
      name: "Operações Gerais",
      code: "OPS",
      description: "Coordenação de fluxos, governança, prazos e eficiência operacional",
      color: "#059669",
    },
  });

  const depBiz = await prisma.department.create({
    data: {
      name: "Negócios e Estratégia",
      code: "CEO_BIZ",
      description: "Parcerias comerciais, relações institucionais e captação de recursos",
      color: "#2563eb",
    },
  });

  const depTech = await prisma.department.create({
    data: {
      name: "Tecnologia e Engenharia",
      code: "CTO_ENG",
      description: "Hardware, firmware, visão computacional, IA e sistemas do Rover V3",
      color: "#7c3aed",
    },
  });

  const depProd = await prisma.department.create({
    data: {
      name: "Produto e Requisitos",
      code: "CPO_PROD",
      description: "Definição de requisitos, backlog de produto, UX e testes de campo",
      color: "#d97706",
    },
  });

  // 4. SENHA PADRÃO DE DEMONSTRAÇÃO E ACESSO INICIAL
  const defaultPasswordHash = await bcrypt.hash("Valtexa@2026", 10);

  // 5. USUÁRIOS FUNDADORES E EQUIPES
  // COO — Pedro Lucas Vergueiro
  const userCOO = await prisma.user.create({
    data: {
      email: "pedro@valtexa.com",
      name: "Pedro Lucas Vergueiro",
      passwordHash: await bcrypt.hash("Valtexa@Pedro2026", 10),
      title: "Chief Operating Officer",
      initials: "PV",
      departmentId: depOps.id,
      timezone: "America/Sao_Paulo",
    },
  });
  await prisma.userRole.create({ data: { userId: userCOO.id, roleId: roleCOO.id } });

  // CEO — Murilo
  const userCEO = await prisma.user.create({
    data: {
      email: "murilo@valtexa.com",
      name: "Murilo",
      passwordHash: await bcrypt.hash("Valtexa@Murilo2026", 10),
      title: "Chief Executive Officer",
      initials: "MU",
      departmentId: depBiz.id,
      timezone: "America/Sao_Paulo",
    },
  });
  await prisma.userRole.create({ data: { userId: userCEO.id, roleId: roleCEO.id } });

  // CTO — Gabriel
  const userCTO = await prisma.user.create({
    data: {
      email: "gabriel@valtexa.com",
      name: "Gabriel",
      passwordHash: await bcrypt.hash("Valtexa@Gabriel2026", 10),
      title: "Chief Technology Officer",
      initials: "GA",
      departmentId: depTech.id,
      timezone: "America/Sao_Paulo",
    },
  });
  await prisma.userRole.create({ data: { userId: userCTO.id, roleId: roleCTO.id } });

  // CPO — Nicholas
  const userCPO = await prisma.user.create({
    data: {
      email: "nicholas@valtexa.com",
      name: "Nicholas",
      passwordHash: await bcrypt.hash("Valtexa@Nicholas2026", 10),
      title: "Chief Product Officer",
      initials: "NI",
      departmentId: depProd.id,
      timezone: "America/Sao_Paulo",
    },
  });
  await prisma.userRole.create({ data: { userId: userCPO.id, roleId: roleCPO.id } });


  // (Colaboradores serão adicionados manualmente pelos executivos quando necessário)

  // 6. RELACIONAMENTOS HIERÁRQUICOS (ORGANOGRAMA)
  // Coordenação operacional: COO orienta a liderança executiva
  await prisma.reportingRelationship.create({
    data: { managerId: userCOO.id, subordinateId: userCEO.id, notes: "Coordenação operacional semanal" },
  });
  await prisma.reportingRelationship.create({
    data: { managerId: userCOO.id, subordinateId: userCTO.id, notes: "Coordenação operacional semanal" },
  });
  await prisma.reportingRelationship.create({
    data: { managerId: userCOO.id, subordinateId: userCPO.id, notes: "Coordenação operacional semanal" },
  });

  // (Relações de hierarquia interna serão criadas conforme colaboradores forem adicionados)

  // 7. PROJETOS INICIAIS
  const projRover = await prisma.project.create({
    data: {
      name: "ValTexa Rover V3",
      code: "VTX-ROV3",
      description: "Desenvolvimento, calibração sensorial e validação agronômica em campo do Rover V3.",
      status: "EM_ANDAMENTO",
      priority: "CRITICA",
      budgetEstimated: 120000,
      leadId: userCTO.id,
      departmentId: depTech.id,
      startDate: new Date("2026-09-01"),
      targetEndDate: new Date("2026-12-15"),
    },
  });

  const projSaaS = await prisma.project.create({
    data: {
      name: "Plataforma SaaS Agrícola",
      code: "VTX-SAAS",
      description: "Interface web de telemetria, mapa de calor de lavoura e gestão de frotas de robôs.",
      status: "EM_ANDAMENTO",
      priority: "ALTA",
      budgetEstimated: 65000,
      leadId: userCPO.id,
      departmentId: depProd.id,
      startDate: new Date("2026-09-15"),
      targetEndDate: new Date("2026-11-30"),
    },
  });

  const projFunding = await prisma.project.create({
    data: {
      name: "Captação Seed & Parcerias Piloto",
      code: "VTX-SEED",
      description: "Estruturação de rodada de investimento e fechamento de 3 pilotos comerciais com produtores de grãos.",
      status: "EM_ANDAMENTO",
      priority: "ALTA",
      budgetEstimated: 30000,
      leadId: userCEO.id,
      departmentId: depBiz.id,
      startDate: new Date("2026-08-01"),
      targetEndDate: new Date("2026-11-15"),
    },
  });

  // 8. TAREFA CENTRAL DE EXEMPLO (Item do Prompt Mestre)
  const taskRoverValidation = await prisma.task.create({
    data: {
      taskNumber: 101,
      title: "Preparar plano de validação do ValTexa Rover V3",
      description: "Estruturação abrangente de todos os requisitos, baterias de testes e matriz de riscos para iniciar a validação prática do protótipo V3 em campo agrícola real.",
      businessObjective: "Definir as condições técnicas necessárias para iniciar a validação do protótipo sem riscos operacionais em lavoura.",
      expectedResult: "Relatório técnico consolidado, com testes de campo mapeados, custos estimados, análise de segurança e cronograma aprovado.",
      completionCriteria: "Relatório documentado, com testes, custos, riscos, critérios de aprovação e pendências identificadas e assinadas pelo CTO.",
      referenceLinks: JSON.stringify([
        { title: "Especificações do Chassi Rover V3", url: "/docs/hardware/v3-specs.pdf" },
        { title: "Protocolo de Segurança Agrícola", url: "/docs/safety/protocol-agro.pdf" },
      ]),
      requiresApproval: true,
      notesRestrictions: "Depende da calibração preliminar do módulo LiDAR e câmeras estereoscópicas. Não agendar teste com chuva.",
      estimatedHours: 24,
      businessImpact: "Permite comprovar autonomia e avançar para demonstração com cooperativas agrícolas clientes.",
      status: "EM_ANDAMENTO",
      priority: "CRITICA",
      criticalReason: "Marco essencial para a demonstração com investidores e cooperativas no final do trimestre.",
      startDate: new Date("2026-10-12"),
      dueDate: new Date("2026-10-16"),
      createdById: userCOO.id,
      assignedToId: userCTO.id,
      departmentId: depTech.id,
      projectId: projRover.id,
    },
  });

  // Checklists da Tarefa Central
  const checklistItemsData = [
    { title: "Consolidar os requisitos técnicos atuais", isCompleted: true },
    { title: "Identificar componentes ainda não adquiridos", isCompleted: true },
    { title: "Listar os riscos de segurança e operação", isCompleted: false },
    { title: "Definir os testes de navegação", isCompleted: false },
    { title: "Definir os testes de percepção e coleta de dados", isCompleted: false },
    { title: "Estabelecer critérios objetivos de aprovação", isCompleted: false },
    { title: "Estimar custos e tempo de execução", isCompleted: false },
    { title: "Anexar o relatório técnico", isCompleted: false },
    { title: "Submeter o resultado para revisão", isCompleted: false },
  ];

  for (let i = 0; i < checklistItemsData.length; i++) {
    await prisma.checklistItem.create({
      data: {
        taskId: taskRoverValidation.id,
        title: checklistItemsData[i].title,
        isCompleted: checklistItemsData[i].isCompleted,
        position: i + 1,
        completedById: checklistItemsData[i].isCompleted ? userCTO.id : null,
        completedAt: checklistItemsData[i].isCompleted ? new Date() : null,
      },
    });
  }

  // Subtarefas criadas pelo CTO e delegadas à sua equipe
  await prisma.subtask.create({
    data: {
      taskId: taskRoverValidation.id,
      title: "Mapeamento dos testes de percepção e fusão de sensores LiDAR/Câmera",
      description: "Definir cenários de poeira alta e luminosidade solar intensa.",
      status: "EM_ANDAMENTO",
      priority: "ALTA",
      estimatedHours: 12,
      dueDate: new Date("2026-10-15"),
      createdById: userCTO.id,
      assignedToId: userCTO.id,
    },
  });

  // Outras tarefas setoriais para o planejamento semanal
  const taskBizPilots = await prisma.task.create({
    data: {
      taskNumber: 102,
      title: "Fechar termos de parceria piloto com 2 cooperativas agrícolas",
      description: "Negociação das cláusulas contratuais e cronograma de acesso à fazenda experimental para os testes do Rover V3.",
      businessObjective: "Garantir área agrícola de testes e primeiros clientes para a validação comercial.",
      expectedResult: "Cartas de intenção (LOIs) assinadas por cooperativas de soja/milho.",
      completionCriteria: "Contratos preliminares assinados com 2 cooperativas definindo datas de acesso ao talhão.",
      status: "EM_ANDAMENTO",
      priority: "ALTA",
      startDate: new Date("2026-10-12"),
      dueDate: new Date("2026-10-17"),
      createdById: userCOO.id,
      assignedToId: userCEO.id,
      departmentId: depBiz.id,
      projectId: projFunding.id,
      requiresApproval: true,
      estimatedHours: 16,
    },
  });

  const taskProdUX = await prisma.task.create({
    data: {
      taskNumber: 103,
      title: "Consolidar requisitos de telemetria da interface do produtor rural",
      description: "Alinhar quais métricas do Rover (nível de bateria, status do motor, mapa de infestações) devem estar no dashboard principal.",
      businessObjective: "Garantir usabilidade simplificada para operadores agrícolas em tablets robustecidos.",
      expectedResult: "Wireframes validados e documento de especificações de telas aprovado.",
      completionCriteria: "Prototipagem navegável no Figma e aprovação com engenharia e campo.",
      status: "PLANEJADA",
      priority: "MEDIA",
      startDate: new Date("2026-10-13"),
      dueDate: new Date("2026-10-16"),
      createdById: userCOO.id,
      assignedToId: userCPO.id,
      departmentId: depProd.id,
      projectId: projSaaS.id,
      requiresApproval: false,
      estimatedHours: 14,
    },
  });

  // 9. AGENDA EXECUTIVA SEMANAL
  const weeklyPlan = await prisma.weeklyPlan.create({
    data: {
      title: "Planejamento Semanal Executivo - Semana 42 / 2026",
      year: 2026,
      weekNumber: 42,
      startDate: new Date("2026-10-12"),
      endDate: new Date("2026-10-18"),
      status: "EM_EXECUCAO",
      strategicFocus: "Validação técnica do Rover V3, avanço nos contratos de pilotos agrícolas e alinhamento de roadmap do SaaS.",
      publishedAt: new Date("2026-10-12T08:00:00Z"),
      createdById: userCOO.id,
    },
  });

  await prisma.weeklyPlanItem.create({
    data: {
      weeklyPlanId: weeklyPlan.id,
      userId: userCTO.id,
      taskId: taskRoverValidation.id,
      title: "Validação do Plano Técnico do Rover V3 e Testes de Sensores",
      dayOfWeek: 5, // Sexta-feira
      expectedDelivery: "Relatório técnico e cronograma de campo concluídos",
      isPriority: true,
      status: "PLANEJADA",
    },
  });

  await prisma.weeklyPlanItem.create({
    data: {
      weeklyPlanId: weeklyPlan.id,
      userId: userCEO.id,
      taskId: taskBizPilots.id,
      title: "Avanço e fechamento dos termos de 2 cooperativas agrícolas",
      dayOfWeek: 4, // Quinta-feira
      expectedDelivery: "2 minutas de convênio revisadas pelo jurídico e parceiros",
      isPriority: true,
      status: "PLANEJADA",
    },
  });

  await prisma.weeklyPlanItem.create({
    data: {
      weeklyPlanId: weeklyPlan.id,
      userId: userCPO.id,
      taskId: taskProdUX.id,
      title: "Especificação de requisitos do dashboard de telemetria",
      dayOfWeek: 4,
      expectedDelivery: "Fluxo de telas aprovado",
      isPriority: false,
      status: "PLANEJADA",
    },
  });

  await prisma.weeklyPlanItem.create({
    data: {
      weeklyPlanId: weeklyPlan.id,
      userId: userCOO.id,
      title: "Alinhamento operacional de orçamento, compras do Rover e governança semanal",
      dayOfWeek: 1, // Segunda-feira
      expectedDelivery: "Plano de compras do laboratório aprovado",
      isPriority: true,
      status: "CONCLUIDA",
    },
  });

  // 10. REUNIÃO SEMANAL DA LIDERANÇA
  const meeting = await prisma.meeting.create({
    data: {
      title: "Reunião Semanal da Liderança Executiva — ValTexa",
      meetingType: "LIDERANCA_SEMANAL",
      objective: "Alinhamento das prioridades operacionais, riscos técnicos do Rover V3 e parcerias comerciais da semana.",
      scheduledStart: new Date("2026-10-12T09:00:00Z"),
      scheduledEnd: new Date("2026-10-12T10:30:00Z"),
      durationMinutes: 90,
      locationOrUrl: "Sala de Governança ValTexa / Google Meet",
      status: "REALIZADA",
      organizerId: userCOO.id,
      minutesText: "Reunião realizada com todos os fundadores presentes. Alinhado foco total no protótipo Rover V3 para demonstração no campo. Decidido comprar módulo de telemetria homologado pela Anatel.",
      minutesFinalizedAt: new Date("2026-10-12T11:00:00Z"),
    },
  });

  // Participantes da reunião
  await prisma.meetingParticipant.createMany({
    data: [
      { meetingId: meeting.id, userId: userCOO.id, role: "ORGANIZER", attended: true },
      { meetingId: meeting.id, userId: userCEO.id, role: "PARTICIPANT", attended: true },
      { meetingId: meeting.id, userId: userCTO.id, role: "PARTICIPANT", attended: true },
      { meetingId: meeting.id, userId: userCPO.id, role: "PARTICIPANT", attended: true },
    ],
  });

  // Pauta
  await prisma.meetingAgendaItem.createMany({
    data: [
      { meetingId: meeting.id, position: 1, title: "COO: Planejamento, operação, orçamento e execução geral", speaker: "COO", durationMin: 20 },
      { meetingId: meeting.id, position: 2, title: "CEO: Parcerias, oportunidades comerciais e captação Seed", speaker: "CEO", durationMin: 20 },
      { meetingId: meeting.id, position: 3, title: "CTO: Evolução técnica, riscos, custos e testes do Rover V3", speaker: "CTO", durationMin: 25 },
      { meetingId: meeting.id, position: 4, title: "CPO: Requisitos, backlog, entregas e prioridades do produto", speaker: "CPO", durationMin: 15 },
      { meetingId: meeting.id, position: 5, title: "Todos: Decisões pendentes, dependências entre setores e plano da próxima semana", speaker: "TODOS", durationMin: 10 },
    ],
  });

  // Decisão registrada na reunião
  await prisma.decision.create({
    data: {
      meetingId: meeting.id,
      description: "Aprovação emergencial de aquisição do sensor LiDAR resistente a intempéries agrícolas e bateria redundante.",
      rationale: "Mitigação de risco operacional nos testes de campo aberto com poeira e vibração mecânica.",
      status: "APROVADA",
      category: "TECNICA",
      responsibleUserId: userCTO.id,
      dueDate: new Date("2026-10-16"),
    },
  });

  // 11. BASE DE CONHECIMENTO INICIAL
  await prisma.knowledgeDocument.create({
    data: {
      title: "Diretrizes de Governança e Operações Corporativas da ValTexa",
      description: "Documento orientador sobre delegação, ritos semanais e papéis dos sócios fundadores.",
      content: `# Governança Operacional ValTexa\n\nEste documento consolida as práticas de planejamento semanal, acompanhamento de tarefas e autonomia dos fundadores.\n\n### Princípio Central\nToda tarefa possui um responsável único, um objetivo corporativo, um prazo claro e critérios objetivos e verificáveis de conclusão.`,
      category: "Governança e Operações",
      accessLevel: "PUBLIC_INTERNAL",
      authorId: userCOO.id,
    },
  });

  await prisma.knowledgeDocument.create({
    data: {
      title: "Manual de Arquitetura e Segurança do ValTexa Rover V3",
      description: "Visão técnica dos barramentos CAN, ROS 2, redundância de bateria e fail-safe autônomo.",
      content: `# Arquitetura do Rover V3\n\nEspecificações de hardware, barramentos de comunicação e protocolos de parada de emergência para operação autônoma segura em lavouras.`,
      category: "Tecnologia e Engenharia",
      accessLevel: "PUBLIC_INTERNAL",
      authorId: userCTO.id,
      projectId: projRover.id,
    },
  });

  // 12. NOTIFICAÇÕES INICIAIS
  await prisma.notification.create({
    data: {
      userId: userCTO.id,
      title: "Nova tarefa crítica atribuída",
      message: "COO atribuiu a você: 'Preparar plano de validação do ValTexa Rover V3'.",
      category: "TASK_ASSIGNED",
      link: `/tasks/${taskRoverValidation.id}`,
      isRead: false,
    },
  });

  // 13. LOG DE AUDITORIA INICIAL
  await prisma.auditLog.create({
    data: {
      userId: userCOO.id,
      action: "CREATE",
      entity: "WeeklyPlan",
      entityId: weeklyPlan.id,
      details: "Criação e publicação da Agenda Executiva Semanal 42/2026 pelo COO.",
      ipAddress: "127.0.0.1",
      userAgent: "ValTexa System Bootstrap",
    },
  });

  console.log("Seed corporativo da ValTexa concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

