"use strict";
/**
 * Minimal structured logger.
 * Replaces bare console.log/warn/error calls with timestamped, tagged output.
 * Outputs JSON in production (NODE_ENV=production), readable text otherwise.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
exports.createLogger = createLogger;
const isProd = process.env.NODE_ENV === "production";
function write(level, tag, message, meta) {
    const ts = new Date().toISOString();
    if (isProd) {
        process.stdout.write(JSON.stringify({ ts, level, tag, message, ...(meta ? { meta } : {}) }) + "\n");
    }
    else {
        const prefix = `[${ts}] [${level.toUpperCase()}] [${tag}]`;
        const metaStr = meta != null ? ` ${JSON.stringify(meta)}` : "";
        if (level === "error") {
            console.error(`${prefix} ${message}${metaStr}`);
        }
        else if (level === "warn") {
            console.warn(`${prefix} ${message}${metaStr}`);
        }
        else {
            console.log(`${prefix} ${message}${metaStr}`);
        }
    }
}
function createLogger(tag) {
    return {
        info: (message, meta) => write("info", tag, message, meta),
        warn: (message, meta) => write("warn", tag, message, meta),
        error: (message, meta) => write("error", tag, message, meta),
    };
}
exports.log = createLogger("app");
