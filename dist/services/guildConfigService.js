"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGuildConfig = getGuildConfig;
exports.updateGuildConfig = updateGuildConfig;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Global Cache: Stores guild settings in memory
// Key = Guild ID, Value = Config Object
const configCache = new Map();
async function getGuildConfig(guildId) {
    // 1. FAST: Check if we have the config in memory
    if (configCache.has(guildId)) {
        return configCache.get(guildId);
    }
    // 2. SLOW: If not in memory, fetch from Database
    let cfg = await prisma_1.default.guildConfig.findUnique({ where: { guildId } });
    // 3. If it doesn't exist in DB, create a default one
    if (!cfg) {
        cfg = await prisma_1.default.guildConfig.create({
            data: { guildId }
        });
    }
    // 4. Save to Cache so the next request is instant
    configCache.set(guildId, cfg);
    return cfg;
}
async function updateGuildConfig(guildId, data) {
    // 1. Update Database (So data is safe)
    const updated = await prisma_1.default.guildConfig.update({
        where: { guildId },
        data
    });
    // 2. Update Cache (So the bot knows about the change immediately)
    configCache.set(guildId, updated);
    return updated;
}
//# sourceMappingURL=guildConfigService.js.map