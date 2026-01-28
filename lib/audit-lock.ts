/**
 * Simple in-memory lock for preventing concurrent audits on the same lead.
 * Note: This only works within a single server instance.
 * For distributed deployments, use Redis or database locks.
 */

const activeAudits = new Set<string>();

export function acquireAuditLock(leadId: string): boolean {
  if (activeAudits.has(leadId)) {
    return false; // Lock not acquired, audit already in progress
  }
  activeAudits.add(leadId);
  return true; // Lock acquired
}

export function releaseAuditLock(leadId: string): void {
  activeAudits.delete(leadId);
}

export function isAuditInProgress(leadId: string): boolean {
  return activeAudits.has(leadId);
}

export function getActiveAuditCount(): number {
  return activeAudits.size;
}

