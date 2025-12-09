"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleIncome = handleIncome;
const walletService_1 = require("../../services/walletService");
const incomeService_1 = require("../../services/incomeService");
const guildConfigService_1 = require("../../services/guildConfigService"); // Cached Config
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
const discordLogger_1 = require("../../utils/discordLogger");
async function handleIncome(message) {
    const [cmd] = message.content.slice(1).split(/\s+/);
    const commandKey = cmd.toLowerCase();
    if (!["work", "crime", "beg", "slut"].includes(commandKey)) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Unknown", "Use: !work, !crime, !beg or !slut")] });
    }
    // 1. Fetch Config (Instant Cache)
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const emoji = config.currencyEmoji;
    const user = await (0, walletService_1.ensureUserAndWallet)(message.author.id, message.author.tag);
    try {
        const res = await (0, incomeService_1.runIncomeCommand)({
            commandKey,
            discordId: message.author.id,
            guildId: message.guildId ?? null,
            userId: user.id,
            walletId: user.wallet.id
        });
        if (res.success) {
            // Log Success
            await (0, discordLogger_1.logToChannel)(message.client, {
                guild: message.guild,
                type: "ECONOMY",
                title: `Income Success (${commandKey})`,
                description: `**User:** ${message.author.tag}\n**Amount:** ${(0, format_1.fmtCurrency)(res.amount, emoji)}`,
                color: 0x00FF00
            });
            return message.reply({
                embeds: [(0, embed_1.successEmbed)(message.author, `${commandKey.toUpperCase()} SUCCESS`, `You earned **${(0, format_1.fmtCurrency)(res.amount, emoji)}**!`)]
            });
        }
        else {
            // Log Failure (Penalty)
            await (0, discordLogger_1.logToChannel)(message.client, {
                guild: message.guild,
                type: "ECONOMY",
                title: `Income Failed (${commandKey})`,
                description: `**User:** ${message.author.tag}\n**Penalty:** ${(0, format_1.fmtCurrency)(Math.abs(res.amount), emoji)}`,
                color: 0xFF0000
            });
            return message.reply({
                embeds: [(0, embed_1.errorEmbed)(message.author, `${commandKey.toUpperCase()} FAILED`, `You lost **${(0, format_1.fmtCurrency)(Math.abs(res.amount), emoji)}**!`)]
            });
        }
    }
    catch (err) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Cooldown", err.message)] });
    }
}
//# sourceMappingURL=incomeCommands.js.map