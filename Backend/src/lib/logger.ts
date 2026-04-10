/**
 * Minimal structured logger.
 * Replaces bare console.log/warn/error calls with timestamped, tagged output.
 * Outputs JSON in production (NODE_ENV=production), readable text otherwise.
 */

const isProd = process.env.NODE_ENV === "production";

type Level = "info" | "warn" | "error";

function write(level: Level, tag: string, message: string, meta?: unknown) {
  const ts = new Date().toISOString();
  if (isProd) {
    process.stdout.write(
      JSON.stringify({ ts, level, tag, message, ...(meta ? { meta } : {}) }) + "\n"
    );
  } else {
    const prefix = `[${ts}] [${level.toUpperCase()}] [${tag}]`;
    const metaStr = meta != null ? ` ${JSON.stringify(meta)}` : "";
    if (level === "error") {
      console.error(`${prefix} ${message}${metaStr}`);
    } else if (level === "warn") {
      console.warn(`${prefix} ${message}${metaStr}`);
    } else {
      console.log(`${prefix} ${message}${metaStr}`);
    }
  }
}

export function createLogger(tag: string) {
  return {
    info: (message: string, meta?: unknown) => write("info", tag, message, meta),
    warn: (message: string, meta?: unknown) => write("warn", tag, message, meta),
    error: (message: string, meta?: unknown) => write("error", tag, message, meta),
  };
}

export const log = createLogger("app");
