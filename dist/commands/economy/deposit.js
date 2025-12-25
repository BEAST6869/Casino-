"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDeposit = handleDeposit;
const walletService_1 = require("../../services/walletService");
const bankService_1 = require("../../services/bankService");
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
const discordLogger_1 = require("../../utils/discordLogger");
async function handleDeposit(message, args) {
    const user = await (0, walletService_1.ensureUserAndWallet)(message.author.id, message.guildId, message.author.tag);
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const emoji = config.currencyEmoji;
    const wallet = user.wallet;
    const amountStr = args[0];
    if (!amountStr) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", `Usage: \`${config.prefix}dep <amount/all>\``)] });
    }
    const amount = (0, format_1.parseSmartAmount)(amountStr, user.wallet.balance);
    if (isNaN(amount) || amount <= 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Please enter a valid positive number.")] });
    }
    try {
        const { bank, actualAmount } = await (0, bankService_1.depositToBank)(wallet.id, user.id, amount, message.guildId);
        const updatedBank = await (0, bankService_1.getBankByUserId)(user.id);
        const isPartial = actualAmount < amount;
        const partialMsg = isPartial ? ` (Partial Deposit - Bank Limit Reached)` : "";
        await (0, discordLogger_1.logToChannel)(message.client, {
            guild: message.guild,
            type: "ECONOMY",
            title: "Bank Deposit",
            description: `**User:** ${message.author.tag}\n**Amount:** ${(0, format_1.fmtCurrency)(actualAmount, emoji)}${partialMsg}\n**New Balance:** ${(0, format_1.fmtCurrency)(updatedBank?.balance ?? 0, emoji)}`,
            color: 0x00AAFF
        });
        return message.reply({
            embeds: [
                (0, embed_1.successEmbed)(message.author, isPartial ? "Partial Deposit" : "Deposit Successful", `Deposited **${(0, format_1.fmtCurrency)(actualAmount, emoji)}**${partialMsg}.\nBank: **${(0, format_1.fmtCurrency)(updatedBank?.balance ?? 0, emoji)}**`)
            ]
        });
    }
    catch (err) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Failed", err.message)] });
    }
}
//# sourceMappingURL=deposit.js.map