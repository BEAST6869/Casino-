"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionLevel = void 0;
exports.getPermissionLevel = getPermissionLevel;
exports.canActOn = canActOn;
const discord_js_1 = require("discord.js");
const prisma_1 = __importDefault(require("./prisma"));
var PermissionLevel;
(function (PermissionLevel) {
    PermissionLevel[PermissionLevel["MEMBER"] = 0] = "MEMBER";
    PermissionLevel[PermissionLevel["ADMIN"] = 1] = "ADMIN";
    PermissionLevel[PermissionLevel["CASINO_ADMIN"] = 2] = "CASINO_ADMIN";
    PermissionLevel[PermissionLevel["OWNER"] = 3] = "OWNER";
    PermissionLevel[PermissionLevel["BOT_OWNER"] = 4] = "BOT_OWNER";
})(PermissionLevel || (exports.PermissionLevel = PermissionLevel = {}));
const BOT_OWNER_ID = "1288340046449086567";
async function getPermissionLevel(message, member) {
    if (member.id === BOT_OWNER_ID)
        return PermissionLevel.BOT_OWNER;
    if (member.id === message.guild.ownerId)
        return PermissionLevel.OWNER;
    const user = await prisma_1.default.user.findUnique({
        where: {
            discordId_guildId: {
                discordId: member.id,
                guildId: message.guild.id
            }
        }
    });
    if (user && user.isCasinoAdmin)
        return PermissionLevel.CASINO_ADMIN;
    if (member.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator))
        return PermissionLevel.ADMIN;
    return PermissionLevel.MEMBER;
}
async function canActOn(actorLevel, targetLevel) {
    if (actorLevel === PermissionLevel.OWNER)
        return true;
    return actorLevel > targetLevel;
}
//# sourceMappingURL=permissions.js.map