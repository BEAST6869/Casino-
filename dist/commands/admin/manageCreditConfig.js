"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleViewCreditTiers = handleViewCreditTiers;
exports.handleDeleteCreditTier = handleDeleteCreditTier;
const discord_js_1 = require("discord.js");
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
async function handleViewCreditTiers(message) {
    if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "Admins only.")] });
    }
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const tiers = config.creditConfig || [];
    if (tiers.length === 0) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Credit Tiers", "No custom credit tiers configured.")]
        });
    }
    // Sort by score
    tiers.sort((a, b) => a.minScore - b.minScore);
    const desc = tiers.map((c) => `• **Score ${c.minScore}+**\n   Max Loan: ${config.currencyEmoji} ${c.maxLoan}\n   Duration: ${(0, format_1.formatDuration)(Math.round(c.maxDays * 86400000))}`).join("\n\n");
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle("<a:credits:1445689337172721716> Credit Configuration Tiers")
        .setDescription(desc)
        .setColor(0x00AAFF)
        .setFooter({ text: `Use !delete-credit-tier <score> to remove one.` });
    return message.reply({ embeds: [embed] });
}
async function handleDeleteCreditTier(message, args) {
    if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "Admins only.")] });
    }
    const score = parseInt(args[0]);
    if (isNaN(score)) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!delete-credit-tier <minScore>`")] });
    }
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    let tiers = config.creditConfig || [];
    const originalLength = tiers.length;
    tiers = tiers.filter((c) => c.minScore !== score);
    if (tiers.length === originalLength) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Not Found", `No tier found with minScore **${score}**.`)]
        });
    }
    await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { creditConfig: tiers });
    return message.reply({
        embeds: [(0, embed_1.successEmbed)(message.author, "Tier Deleted", `Successfully removed credit tier for score **${score}+**.`)]
    });
}
//# sourceMappingURL=manageCreditConfig.js.map