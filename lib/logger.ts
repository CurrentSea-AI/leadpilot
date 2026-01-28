type LogLevel = "info" | "warn" | "error";

type AuditLogData = {
  leadId: string;
  websiteUrl: string;
  durationMs: number;
  success: boolean;
  score?: number;
  error?: string;
};

// Sanitize sensitive data from logs
function sanitize(url: string): string {
  try {
    const parsed = new URL(url);
    // Only log hostname, not full path which might contain sensitive params
    return parsed.hostname;
  } catch {
    return "[invalid-url]";
  }
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data) {
    console[level](`${prefix} ${message}`, JSON.stringify(data));
  } else {
    console[level](`${prefix} ${message}`);
  }
}

export const logger = {
  info: (message: string, data?: Record<string, unknown>) => log("info", message, data),
  warn: (message: string, data?: Record<string, unknown>) => log("warn", message, data),
  error: (message: string, data?: Record<string, unknown>) => log("error", message, data),

  auditStart: (leadId: string, websiteUrl: string) => {
    log("info", `Audit started`, {
      leadId,
      domain: sanitize(websiteUrl),
    });
  },

  auditComplete: (data: AuditLogData) => {
    const logData = {
      leadId: data.leadId,
      domain: sanitize(data.websiteUrl),
      durationMs: data.durationMs,
      durationSec: (data.durationMs / 1000).toFixed(2),
      success: data.success,
      ...(data.score !== undefined && { score: data.score }),
      ...(data.error && { error: data.error }),
    };

    if (data.success) {
      log("info", `Audit completed`, logData);
    } else {
      log("error", `Audit failed`, logData);
    }
  },

  batchAuditSummary: (
    processed: number,
    succeeded: number,
    failed: number,
    totalDurationMs: number
  ) => {
    log("info", `Batch audit completed`, {
      processed,
      succeeded,
      failed,
      totalDurationMs,
      totalDurationSec: (totalDurationMs / 1000).toFixed(2),
      avgPerLeadMs: processed > 0 ? Math.round(totalDurationMs / processed) : 0,
    });
  },
};

export default logger;

