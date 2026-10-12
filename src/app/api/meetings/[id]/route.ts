import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

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
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, name: true, title: true, initials: true } },
        participants: {
          include: { user: { select: { id: true, name: true, title: true, initials: true, email: true } } },
        },
        agendaItems: { orderBy: { position: "asc" } },
        decisions: {
          include: {
            responsibleUser: { select: { id: true, name: true, title: true } },
            resultingTasks: { select: { id: true, taskNumber: true, title: true, status: true, dueDate: true } },
          },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error("Erro ao buscar reunião:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { minutesText, status, attendance = [] } = body;

    const existing = await prisma.meeting.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await prisma.$transaction(async (tx: any) => {
      // Atualizar presença dos participantes se fornecido
      if (Array.isArray(attendance) && attendance.length > 0) {
        for (const item of attendance) {
          if (item.userId) {
            await tx.meetingParticipant.updateMany({
              where: { meetingId: id, userId: item.userId },
              data: { attended: item.attended },
            });
          }
        }
      }

      return await tx.meeting.update({
        where: { id },
        data: {
          minutesText: minutesText !== undefined ? minutesText : undefined,
          status: status !== undefined ? status : undefined,
          minutesFinalizedAt: status === "REALIZADA" && !existing.minutesFinalizedAt ? new Date() : undefined,
        },
      });
    });

    await logAudit({
      userId: user.userId,
      action: "UPDATE",
      entity: "Meeting",
      entityId: id,
      details: { status: updated.status, hasMinutes: !!updated.minutesText },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar ata de reunião:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

