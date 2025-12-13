"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWithdrawBank = handleWithdrawBank;
const walletService_1 = require("../../services/walletService");
const bankService_1 = require("../../services/bankService");
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
const discordLogger_1 = require("../../utils/discordLogger");
async function handleWithdrawBank(message, args) {
    const user = await (0, walletService_1.ensureUserAndWallet)(message.author.id, message.guildId, message.author.tag);
    const bank = await (0, bankService_1.getBankByUserId)(user.id);
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const emoji = config.currencyEmoji;
    if (!bank)
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Bank Account", "You do not have a bank account.")] });
    const amountStr = args[0];
    if (!amountStr) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Usage: `!withdraw <amount | all>`")] });
    }
    const amount = (0, format_1.parseSmartAmount)(amountStr, bank.balance);
    if (isNaN(amount) || amount <= 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Please enter a valid positive number.")] });
    }
    try {
        await (0, bankService_1.withdrawFromBank)(user.wallet.id, user.id, amount);
        const updated = await (0, bankService_1.getBankByUserId)(user.id);
        await (0, discordLogger_1.logToChannel)(message.client, {
            guild: message.guild,
            type: "ECONOMY",
            title: "Bank Withdraw",
            description: `**User:** ${message.author.tag}\n**Amount:** ${(0, format_1.fmtCurrency)(amount, emoji)}\n**New Balance:** ${(0, format_1.fmtCurrency)(updated?.balance ?? 0, emoji)}`,
            color: 0x00AAFF
        });
        return message.reply({
            embeds: [
                (0, embed_1.successEmbed)(message.author, "Withdraw Successful", `Withdrew **${(0, format_1.fmtCurrency)(amount, emoji)}** from bank.\nRemaining bank balance: **${(0, format_1.fmtCurrency)(updated?.balance ?? 0, emoji)}**`)
            ]
        });
    }
    catch (err) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Withdraw Failed", err.message)] });
    }
}
//# sourceMappingURL=withdrawBank.js.map