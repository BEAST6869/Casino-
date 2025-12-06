"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCasinoBan = handleCasinoBan;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const embed_1 = require("../../utils/embed");
async function handleCasinoBan(message, args) {
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Permission", "Administrator required.")] });
    }
    const mention = args[0];
    const reason = args.slice(1).join(" ") || "No reason provided.";
    if (!mention) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!casinoban @user <reason>`")] });
    }
    const discordId = mention.replace(/[<@!>]/g, "");
    try {
        const user = await prisma_1.default.user.upsert({
            where: { discordId },
            create: { discordId, username: "Unknown", isBanned: true },
            update: { isBanned: true }
        });
        return message.reply({
            embeds: [(0, embed_1.successEmbed)(message.author, "User Banned", `🚫 **<@${discordId}>** has been banned from the casino.\nReason: ${reason}`)]
        });
    }
    catch (error) {
        console.error(error);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "Failed to ban user.")] });
    }
}
//# sourceMappingURL=casinoBan.js.map