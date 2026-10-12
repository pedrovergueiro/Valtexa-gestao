import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, signSessionToken, setSessionCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        department: true,
        roles: { include: { role: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      title: user.title,
      initials: user.initials,
      timezone: user.timezone,
      roles: user.roles.map((r) => r.role.name),
      department: user.department ? { id: user.department.id, name: user.department.name } : null,
    });
  } catch (error) {
    console.error("Erro ao obter perfil:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, title, initials, newPassword } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (name && name.trim()) updateData.name = name.trim();
    if (title && title.trim()) updateData.title = title.trim();
    if (initials && initials.trim()) updateData.initials = initials.trim().toUpperCase();
    if (newPassword && newPassword.length >= 6) {
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      include: {
        department: true,
        roles: { include: { role: true } },
      },
    });

    // Atualizar o token de sessão com o novo nome
    const newSessionPayload = {
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      title: updatedUser.title,
      roles: updatedUser.roles.map((r) => r.role.name),
      departmentId: updatedUser.departmentId,
      departmentCode: updatedUser.department?.code || null,
    };
    const newToken = await signSessionToken(newSessionPayload);
    await setSessionCookie(newToken);

    await logAudit({
      userId: session.userId,
      action: "UPDATE",
      entity: "User",
      entityId: session.userId,
      details: {
        oldName: session.name,
        newName: updatedUser.name,
        oldTitle: session.title,
        newTitle: updatedUser.title,
        passwordChanged: !!newPassword,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        title: updatedUser.title,
        initials: updatedUser.initials,
        timezone: updatedUser.timezone,
        roles: updatedUser.roles.map((r) => r.role.name),
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    return NextResponse.json({ error: "Erro interno ao atualizar perfil" }, { status: 500 });
  }
}

