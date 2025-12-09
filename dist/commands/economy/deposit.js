"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDeposit = handleDeposit;
const walletService_1 = require("../../services/walletService");
const bankService_1 = require("../../services/bankService");
const guildConfigService_1 = require("../../services/guildConfigService"); // Cached Config
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
const discordLogger_1 = require("../../utils/discordLogger");
async function handleDeposit(message, args) {
    const user = await (0, walletService_1.ensureUserAndWallet)(message.author.id, message.author.tag);
    // 1. Fetch Config (Instant Cache)
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const emoji = config.currencyEmoji;
    const wallet = user.wallet;
    let amount = 0;
    if (args[0]?.toLowerCase() === "all") {
        amount = wallet.balance;
    }
    else {
        amount = parseInt(args[0] || "0");
    }
    if (!amount || amount <= 0)
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "Invalid amount.")] });
    try {
        await (0, bankService_1.depositToBank)(wallet.id, user.id, amount);
        const bank = await (0, bankService_1.getBankByUserId)(user.id);
        // Log Deposit
        await (0, discordLogger_1.logToChannel)(message.client, {
            guild: message.guild,
            type: "ECONOMY",
            title: "Bank Deposit",
            description: `**User:** ${message.author.tag}\n**Amount:** ${(0, format_1.fmtCurrency)(amount, emoji)}\n**New Balance:** ${(0, format_1.fmtCurrency)(bank?.balance ?? 0, emoji)}`,
            color: 0x00AAFF
        });
        return message.reply({
            embeds: [
                (0, embed_1.successEmbed)(message.author, "Deposit Successful", `Deposited **${(0, format_1.fmtCurrency)(amount, emoji)}**.\nBank: **${(0, format_1.fmtCurrency)(bank?.balance ?? 0, emoji)}**`)
            ]
        });
    }
    catch (err) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Failed", err.message)] });
    }
}
//# sourceMappingURL=deposit.js.map