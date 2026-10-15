import { SessionPayload } from "./auth";

export function hasRole(user: SessionPayload | null, roles: string | string[]): boolean {
  if (!user || !user.roles) return false;
  const roleList = Array.isArray(roles) ? roles : [roles];
  return user.roles.some((r) => roleList.includes(r));
}

export function isCOO(user: SessionPayload | null): boolean {
  return hasRole(user, "COO");
}

export function isCEO(user: SessionPayload | null): boolean {
  return hasRole(user, "CEO");
}

export function isCTO(user: SessionPayload | null): boolean {
  return hasRole(user, "CTO");
}

export function isCPO(user: SessionPayload | null): boolean {
  return hasRole(user, "CPO");
}

export function isExecutive(user: SessionPayload | null): boolean {
  return hasRole(user, ["COO", "CEO", "CTO", "CPO"]);
}

export function canManageWeeklyPlan(user: SessionPayload | null): boolean {
  return isCOO(user);
}

export function canCreateTaskForDepartment(
  user: SessionPayload | null,
  targetDepartmentCode?: string | null
): boolean {
  if (!user) return false;
  // COO pode criar tarefas para qualquer departamento
  if (isCOO(user)) return true;
  // Executivos podem criar para seu próprio departamento
  if (isExecutive(user)) {
    return user.departmentCode === targetDepartmentCode;
  }
  return false;
}

export function canApproveTask(
  user: SessionPayload | null,
  task: { createdById: string }
): boolean {
  if (!user) return false;
  // O COO pode aprovar qualquer tarefa; o criador aprova as suas
  return isCOO(user) || task.createdById === user.userId;
}


export function canEditTask(
  user: SessionPayload | null,
  task: { createdById: string }
): boolean {
  if (!user) return false;
  // O COO edita qualquer tarefa; demais usuários apenas as que criaram
  return isCOO(user) || task.createdById === user.userId;
}
