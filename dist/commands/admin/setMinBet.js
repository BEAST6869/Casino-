"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetMinBet = handleSetMinBet;
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
const guildConfigService_2 = require("../../services/guildConfigService");
async function handleSetMinBet(message, args) {
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "Admins only.")] });
    }
    const amountStr = args[0];
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount < 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Usage: `!minbet <amount>`")] });
    }
    const config = await (0, guildConfigService_2.getGuildConfig)(message.guildId);
    await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { minBet: amount });
    return message.reply({
        embeds: [(0, embed_1.successEmbed)(message.author, "Min Bet Updated", `Minimum bet set to **${(0, format_1.fmtCurrency)(amount, config.currencyEmoji)}**.`)]
    });
}
//# sourceMappingURL=setMinBet.js.map