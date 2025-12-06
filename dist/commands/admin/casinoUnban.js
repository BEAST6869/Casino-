"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCasinoUnban = handleCasinoUnban;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const embed_1 = require("../../utils/embed");
async function handleCasinoUnban(message, args) {
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Permission", "Administrator required.")] });
    }
    const mention = args[0];
    if (!mention) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!casinounban @user`")] });
    }
    const discordId = mention.replace(/[<@!>]/g, "");
    try {
        const user = await prisma_1.default.user.update({
            where: { discordId },
            data: { isBanned: false }
        });
        return message.reply({
            embeds: [(0, embed_1.successEmbed)(message.author, "User Unbanned", `✅ **<@${discordId}>** has been unbanned from the casino.`)]
        });
    }
    catch (error) {
        console.error(error);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "Failed to unban user (maybe they aren't in the DB?).")] });
    }
}
//# sourceMappingURL=casinoUnban.js.map