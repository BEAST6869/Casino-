"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWithdrawBank = handleWithdrawBank;
const walletService_1 = require("../../services/walletService");
const bankService_1 = require("../../services/bankService");
const guildConfigService_1 = require("../../services/guildConfigService"); // Import
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format"); // Import fmtCurrency
async function handleWithdrawBank(message, args) {
    const user = await (0, walletService_1.ensureUserAndWallet)(message.author.id, message.author.tag);
    const bank = await (0, bankService_1.getBankByUserId)(user.id);
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId); // Fetch config
    const emoji = config.currencyEmoji;
    if (!bank)
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Bank Account", "You do not have a bank account.")] });
    // ... (args parsing logic) ...
    let amount = 0;
    if (args[0] && args[0].toLowerCase() === "all") {
        amount = bank.balance;
    }
    else {
        amount = parseInt(args[0] || "0");
    }
    if (!amount || amount <= 0)
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Usage: `!withdraw <amount | all>`")] });
    try {
        await (0, bankService_1.withdrawFromBank)(user.wallet.id, user.id, amount);
        const updated = await (0, bankService_1.getBankByUserId)(user.id);
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