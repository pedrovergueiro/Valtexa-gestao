import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) {
      await logAudit({
        userId: user.userId,
        action: "UPDATE",
        entity: "Session",
        entityId: user.userId,
        details: { action: "LOGOUT" },
      });
    }

    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro no logout:", err);
    return NextResponse.json({ error: "Erro ao encerrar sessão" }, { status: 500 });
  }
}

