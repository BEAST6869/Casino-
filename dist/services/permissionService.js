"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOT_OWNER_ID = void 0;
exports.checkCommandPermission = checkCommandPermission;
const prisma_1 = __importDefault(require("../utils/prisma"));
const guildConfigService_1 = require("./guildConfigService");
exports.BOT_OWNER_ID = "1288340046449086567";
async function checkCommandPermission(message, commandName) {
    if (!message.guild || !message.member)
        return { allowed: true };
    const guildId = message.guild.id;
    const userId = message.author.id;
    const channelId = message.channel.id;
    const member = message.member;
    if (userId === exports.BOT_OWNER_ID)
        return { allowed: true };
    if (userId === message.guild.ownerId)
        return { allowed: true };
    if (member.permissions.has("Administrator"))
        return { allowed: true };
    const config = await (0, guildConfigService_1.getGuildConfig)(guildId);
    const userDb = await prisma_1.default.user.findUnique({
        where: { discordId_guildId: { discordId: userId, guildId } },
        select: { isCasinoAdmin: true }
    });
    const isCasinoAdmin = userDb?.isCasinoAdmin ?? false;
    if (isCasinoAdmin)
        return { allowed: true };
    const permissions = await prisma_1.default.commandPermission.findMany({
        where: {
            guildId,
            command: commandName,
            OR: [
                { targetType: "USER", targetId: userId },
                { targetType: "ROLE", targetId: { in: member.roles.cache.map(r => r.id) } },
                { targetType: "CHANNEL", targetId: channelId }
            ]
        }
    });
    const userAllow = permissions.some(p => p.targetType === "USER" && p.targetId === userId && p.action === "ALLOW");
    const roleAllow = permissions.some(p => p.targetType === "ROLE" && member.roles.cache.has(p.targetId) && p.action === "ALLOW");
    if (userAllow || roleAllow)
        return { allowed: true };
    const channelAllow = permissions.some(p => p.targetType === "CHANNEL" && p.targetId === channelId && p.action === "ALLOW");
    if (channelAllow)
        return { allowed: true };
    const channelDeny = permissions.some(p => p.targetType === "CHANNEL" && p.targetId === channelId && p.action === "DENY");
    if (channelDeny)
        return { allowed: false, reason: "Command disabled in this channel." };
    if (config.disabledCommands.includes(commandName)) {
        return { allowed: false, reason: "Command is globally disabled." };
    }
    if (config.casinoChannels.length > 0) {
        if (!config.casinoChannels.includes(channelId)) {
            const channelAllow = permissions.some(p => p.targetType === "CHANNEL" && p.targetId === channelId && p.action === "ALLOW");
            if (!channelAllow) {
                return { allowed: false, reason: "This channel is not a designated Casino Channel." };
            }
        }
    }
    return { allowed: true };
}
//# sourceMappingURL=permissionService.js.map