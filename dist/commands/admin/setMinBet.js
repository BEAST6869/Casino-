"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetMinBet = handleSetMinBet;
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
async function handleSetMinBet(message, args) {
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "Admins only.")] });
    }
    const amountStr = args[0];
    if (!amountStr) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!setminbet <amount>`")] });
    }
    const amount = (0, format_1.parseSmartAmount)(amountStr);
    if (isNaN(amount) || amount < 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Please provide a valid number.")] });
    }
    await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { minBet: amount });
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    return message.reply({
        embeds: [(0, embed_1.successEmbed)(message.author, "Min Bet Updated", `Minimum bet set to **${(0, format_1.fmtCurrency)(amount, config.currencyEmoji)}**.`)]
    });
}
//# sourceMappingURL=setMinBet.js.map