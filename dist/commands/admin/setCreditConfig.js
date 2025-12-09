"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetCreditConfig = handleSetCreditConfig;
const discord_js_1 = require("discord.js");
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
async function handleSetCreditConfig(message, args) {
    if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "Admins only.")] });
    }
    // Schema: !set-credit-config <minScore> <maxLoan> <days>
    // args from router are ["500", "50000", "7"] or ["500", "50000", "1d", "12h"]
    const minScore = parseInt(args[0]);
    const maxLoan = parseInt(args[1]);
    const durationStr = args.slice(2).join(" ");
    const maxDays = (0, format_1.parseDurationToDays)(durationStr);
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    if (isNaN(minScore) || isNaN(maxLoan) || maxDays === null || maxDays <= 0) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", `Usage: \`${config.prefix}set-credit-config <minScore> <maxLoan> <duration>\`\nExample: \`${config.prefix}set-credit-config 500 50000 7d\` or \`1d 12h\``)]
        });
    }
    let currentConfig = config.creditConfig || [];
    // Remove existing config for this exact score if exists, or just add new one
    currentConfig = currentConfig.filter((c) => c.minScore !== minScore);
    currentConfig.push({ minScore, maxLoan, maxDays });
    // Sort by score
    currentConfig.sort((a, b) => a.minScore - b.minScore);
    await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { creditConfig: currentConfig });
    const tiersList = currentConfig.map((c) => `• Score **${c.minScore}+** → Max Loan: **${c.maxLoan}** (${(0, format_1.formatDuration)(Math.round(c.maxDays * 86400000))})`).join("\n");
    return message.reply({
        embeds: [(0, embed_1.successEmbed)(message.author, "<a:credits:1445689337172721716> Credit Config Updated", `Added tier for Score **${minScore}**.\n\n**Current Tiers:**\n${tiersList}`)]
    });
}
//# sourceMappingURL=setCreditConfig.js.map