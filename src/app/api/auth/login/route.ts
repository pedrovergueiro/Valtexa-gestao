import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signSessionToken, setSessionCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios" },
        { status: 400 }
      );
    }

    let cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes("@")) {
      cleanEmail = `${cleanEmail}@valtexa.com`;
    }

    // Mapeamento de apelidos de cargo para os e-mails dos fundadores
    const emailAliases: Record<string, string> = {
      "coo@valtexa.com": "pedro@valtexa.com",
      "ceo@valtexa.com": "murilo@valtexa.com",
      "cto@valtexa.com": "gabriel@valtexa.com",
      "cpo@valtexa.com": "nicholas@valtexa.com",
    };
    if (emailAliases[cleanEmail]) {
      cleanEmail = emailAliases[cleanEmail];
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        roles: { include: { role: true } },
        department: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Credenciais inválidas ou usuário inativo" },
        { status: 401 }
      );
    }

    // Aceita a senha específica cadastrada ou a senha padrão corporativa
    const passwordMatch =
      (await bcrypt.compare(password, user.passwordHash)) ||
      (await bcrypt.compare(password, await bcrypt.hash("Valtexa@2026", 10))) ||
      password === "Valtexa@2026";

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
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
      details: { email: user.email, name: user.name },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.title,
        initials: user.initials,
        roles,
        department: user.department ? { id: user.department.id, name: user.department.name, code: user.department.code } : null,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor de autenticação" },
      { status: 500 }
    );
  }
}

