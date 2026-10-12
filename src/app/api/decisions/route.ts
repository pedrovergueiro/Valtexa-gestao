import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const decisions = await prisma.decision.findMany({
      include: {
        meeting: { select: { id: true, title: true, scheduledStart: true } },
        responsibleUser: { select: { id: true, name: true, title: true, initials: true } },
        resultingTasks: {
          select: {
            id: true,
            taskNumber: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignedTo: { select: { name: true } },
          },
        },
      },
      orderBy: { decisionDate: "desc" },
    });

    return NextResponse.json(decisions);
  } catch (error) {
    console.error("Erro ao listar decisões:", error);
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
    const { meetingId, description, rationale, category = "OPERACIONAL", status = "APROVADA", responsibleUserId, dueDate } = body;

    if (!description) {
      return NextResponse.json({ error: "Descrição da decisão é obrigatória" }, { status: 400 });
    }

    const decision = await prisma.decision.create({
      data: {
        meetingId: meetingId || null,
        description,
        rationale: rationale || null,
        category,
        status,
        responsibleUserId: responsibleUserId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        responsibleUser: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId: user.userId,
      action: "CREATE",
      entity: "Decision",
      entityId: decision.id,
      details: { description, category, status },
    });

    return NextResponse.json(decision, { status: 201 });
  } catch (error) {
    console.error("Erro ao registrar decisão:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

