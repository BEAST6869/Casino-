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
    const amountStr = args[0];
    if (!amountStr) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Usage: `!dep <amount/all>`")] });
    }
    const amount = (0, format_1.parseSmartAmount)(amountStr, user.wallet.balance);
    if (isNaN(amount) || amount <= 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Please enter a valid positive number.")] });
    }
    try {
        const { bank, actualAmount } = await (0, bankService_1.depositToBank)(wallet.id, user.id, amount, message.guildId);
        // Refresh bank used to be handled by getBankByUserId but now we likely have updated bank or can fetch if needed, 
        // but the return object 'bank' is the *pre-update* object + transaction updates it. 
        // Actually Prisma update returns the new object. In bankService we returned 'bank' which was the *found* object, not the updated one.
        // Wait, in my bankService update:
        /*
           prisma.bank.update(...) is inside transaction.
           The function likely returns 'bank' which is the OLD object because we just did 'const bank = await ensureBank'.
           We should probably fetch the new balance or just add actualAmount to the old balance for display.
           Or better, let's fetch it freshly to be 100% sure.
        */
        const updatedBank = await (0, bankService_1.getBankByUserId)(user.id);
        const isPartial = actualAmount < amount;
        const partialMsg = isPartial ? ` (Partial Deposit - Bank Limit Reached)` : "";
        // Log Deposit
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