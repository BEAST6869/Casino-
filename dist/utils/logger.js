"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.info = info;
exports.warn = warn;
exports.error = error;
// src/utils/logger.ts
function info(...args) { console.log("[INFO]", ...args); }
function warn(...args) { console.warn("[WARN]", ...args); }
function error(...args) { console.error("[ERR]", ...args); }
//# sourceMappingURL=logger.js.map