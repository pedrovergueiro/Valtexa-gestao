import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSessionToken, setSessionCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "E-mail não fornecido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        roles: { include: { role: true } },
        department: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Usuário não encontrado ou inativo" }, { status: 404 });
    }

    const roles = user.roles.map((r) => r.role.name);
    const sessionPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      title: user.title,
      roles,
      departmentId: user.departmentId,
      departmentCode: user.department?.code || null,
    };

    const token = await signSessionToken(sessionPayload);
    await setSessionCookie(token);

    await logAudit({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      details: { mode: "SWITCH_USER", switchedTo: user.email },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.title,
        roles,
        department: user.department ? { id: user.department.id, name: user.department.name } : null,
      },
    });
  } catch (error) {
    console.error("Erro no switch-user:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

