"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetCreditScore = handleSetCreditScore;
const discord_js_1 = require("discord.js");
const walletService_1 = require("../../services/walletService");
const embed_1 = require("../../utils/embed");
const discordLogger_1 = require("../../utils/discordLogger");
const guildConfigService_1 = require("../../services/guildConfigService");
const prisma_1 = __importDefault(require("../../utils/prisma"));
async function handleSetCreditScore(message, args) {
    if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "Admins only.")] });
    }
    // Check for "all" argument first
    if (args[0]?.toLowerCase() === "all" || args[0]?.toLowerCase() === "everyone") {
        const amountArg = args[1];
        if (!amountArg) {
            return message.reply({
                embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!set-credit-score all <amount>`\nExample: `!set-credit-score all 500`")]
            });
        }
        const amount = parseInt(amountArg);
        if (isNaN(amount) || amount < 0 || amount > 5000) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Score must be between 0 and 5000.")] });
        }
        // Bulk Update
        const result = await prisma_1.default.user.updateMany({
            data: { creditScore: amount }
        });
        // Log it
        await (0, discordLogger_1.logToChannel)(message.client, {
            guild: message.guild,
            type: "ADMIN",
            title: "Bulk Credit Score Set",
            description: `**Admin:** ${message.author.tag}\n**Scope:** ALL USERS\n**New Score:** ${amount}\n**Affected:** ${result.count} users`,
            color: 0xFF4500 // Red-Orange
        });
        return message.reply({
            embeds: [(0, embed_1.successEmbed)(message.author, "Bulk Update Complete", `Set credit score to **${amount}** for **${result.count}** users.`)]
        });
    }
    // Existing Single User Logic
    const targetUser = message.mentions.users.first();
    // Use last arg as amount usually, or find the number
    const amountArg = args.find(a => !a.startsWith("<@") && !isNaN(parseInt(a)));
    if (!targetUser || !amountArg) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!set-credit-score @user <amount>` or `!set-credit-score all <amount>`")]
        });
    }
    const amount = parseInt(amountArg);
    if (isNaN(amount) || amount < 0 || amount > 5000)
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Score must be between 0 and 5000.")] });
    // Update DB - SET instead of increment
    const user = await (0, walletService_1.ensureUserAndWallet)(targetUser.id, targetUser.tag);
    const updatedUser = await prisma_1.default.user.update({
        where: { id: user.id },
        data: { creditScore: amount }
    });
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    await (0, discordLogger_1.logToChannel)(message.client, {
        guild: message.guild,
        type: "ADMIN",
        title: "Credit Score Set",
        description: `**Admin:** ${message.author.tag}\n**User:** ${targetUser.tag}\n**Old Score:** ${user.creditScore}\n**New Score:** ${updatedUser.creditScore}`,
        color: 0xFFA500
    });
    return message.reply({
        embeds: [(0, embed_1.successEmbed)(message.author, "Credit Score Updated", `Set ${targetUser.username}'s credit score to **${updatedUser.creditScore}**.`)]
    });
}
//# sourceMappingURL=manageCreditScore.js.map