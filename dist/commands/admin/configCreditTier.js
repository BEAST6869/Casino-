"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleConfigCreditTier = handleConfigCreditTier;
const discord_js_1 = require("discord.js");
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
async function handleConfigCreditTier(message, args) {
    if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "Admins only.")] });
    }
    // Schema: !configcredittier <minScore> <maxLoan> <duration>
    const minScore = parseInt(args[0]);
    const maxLoan = parseInt(args[1]);
    const durationStr = args.slice(2).join(" ");
    const maxDays = (0, format_1.parseDurationToDays)(durationStr);
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    if (isNaN(minScore) || isNaN(maxLoan) || maxDays === null || maxDays <= 0) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", `Usage: \`${config.prefix}configcredittier <minScore> <maxLoan> <duration>\`\nExample: \`${config.prefix}configcredittier 500 50000 7d\``)]
        });
    }
    let currentConfig = config.creditConfig || [];
    // Find if tier exists
    const index = currentConfig.findIndex((c) => c.minScore === minScore);
    if (index === -1) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Tier Not Found", `No credit tier found for score **${minScore}**.\nUse \`${config.prefix}addcredittier\` to create one.`)]
        });
    }
    // Update existing tier
    currentConfig[index] = { minScore, maxLoan, maxDays };
    // Sort by score
    currentConfig.sort((a, b) => a.minScore - b.minScore);
    await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { creditConfig: currentConfig });
    const tiersList = currentConfig.map((c) => `• Score **${c.minScore}+** → Max Loan: **${c.maxLoan}** (${(0, format_1.formatDuration)(Math.round(c.maxDays * 86400000))})`).join("\n");
    return message.reply({
        embeds: [(0, embed_1.successEmbed)(message.author, "<a:credits:1445689337172721716> Credit Tier Updated", `Successfully configured tier for Score **${minScore}+**.\n\n**Current Tiers:**\n${tiersList}`)]
    });
}
//# sourceMappingURL=configCreditTier.js.map