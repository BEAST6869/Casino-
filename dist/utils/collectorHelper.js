"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTextCollector = createTextCollector;
// Helper to get message collector from guild text channels (avoids TS errors)
function createTextCollector(message, filter, options = {}) {
    // @ts-ignore - Guild text channels always have createMessageCollector
    return message.channel.createMessageCollector({ filter, ...options });
}
//# sourceMappingURL=collectorHelper.js.map