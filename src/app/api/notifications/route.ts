import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.userId, isRead: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Erro ao listar notificações:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll = false } = body;

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: user.userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId, userId: user.userId },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Parâmetros insuficientes" }, { status: 400 });
  } catch (error) {
    console.error("Erro ao atualizar notificação:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

