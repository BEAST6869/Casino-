"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCasinoBanList = handleCasinoBanList;
const discord_js_1 = require("discord.js");
const prisma_1 = __importDefault(require("../../utils/prisma"));
const embed_1 = require("../../utils/embed");
const permissionUtils_1 = require("../../utils/permissionUtils");
async function handleCasinoBanList(message, args) {
    if (!message.member || !(await (0, permissionUtils_1.canExecuteAdminCommand)(message, message.member))) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Permission", "Administrator or Bot Commander required.")] });
    }
    try {
        const bannedUsers = await prisma_1.default.user.findMany({
            where: { isBanned: true },
            select: { discordId: true, username: true }
        });
        if (bannedUsers.length === 0) {
            return message.reply({
                embeds: [new discord_js_1.EmbedBuilder().setColor("#00ff00").setTitle("Casino Ban List").setDescription("No users are currently banned.")]
            });
        }
        const description = bannedUsers
            .map((u, i) => `${i + 1}. <@${u.discordId}>`)
            .join("\n");
        const embed = new discord_js_1.EmbedBuilder()
            .setColor("#ff0000")
            .setTitle(`Casino Ban List (${bannedUsers.length})`)
            .setDescription(description)
            .setFooter({ text: `Requested by ${message.author.tag}` });
        return message.reply({ embeds: [embed] });
    }
    catch (error) {
        console.error(error);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "Failed to fetch ban list.")] });
    }
}
//# sourceMappingURL=casinoBanList.js.map