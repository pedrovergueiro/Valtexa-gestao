import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        department: true,
        roles: { include: { role: true } },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.title,
        initials: user.initials,
        timezone: user.timezone,
        department: user.department ? {
          id: user.department.id,
          name: user.department.name,
          code: user.department.code,
          color: user.department.color,
        } : null,
        roles: user.roles.map((r) => r.role.name),
      },
    });
  } catch (error) {
    console.error("Erro na verificação de sessão:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

