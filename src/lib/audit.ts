import { prisma } from "./prisma";

interface RecordAuditParams {
  userId?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "PUBLISH" | "CLOSE" | "LOGIN";
  entity: string;
  entityId: string;
  details?: Record<string, unknown> | string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit({
  userId,
  action,
  entity,
  entityId,
  details,
  ipAddress,
  userAgent,
}: RecordAuditParams) {
  try {
    const detailsString =
      typeof details === "object" ? JSON.stringify(details) : details || null;

    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId,
        details: detailsString,
        ipAddress: ipAddress || "127.0.0.1",
        userAgent: userAgent || "ValTexa System",
      },
    });
  } catch (err) {
    console.error("Falha ao registrar trilha de auditoria:", err);
  }
}

