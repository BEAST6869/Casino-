"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRemoveMoney = handleRemoveMoney;
const walletService_1 = require("../../services/walletService");
const bankService_1 = require("../../services/bankService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
const guildConfigService_1 = require("../../services/guildConfigService");
async function handleRemoveMoney(message, args) {
    // 1. Permission Check
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "Admins only.")] });
    }
    // Usage: !removemoney <user> <amount> [wallet/bank]
    const targetUser = message.mentions.users.first();
    const rawAmount = args[1]; // args[0] is user mention usually
    if (!targetUser || !rawAmount) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!removemoney @user <amount> [wallet/bank]`")]
        });
    }
    // Handle commas: "1,000" -> "1000"
    const cleanAmount = rawAmount.replace(/,/g, "");
    const amount = parseInt(cleanAmount);
    if (isNaN(amount) || amount <= 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Please provide a valid positive number.")] });
    }
    const type = args[2]?.toLowerCase() === "bank" ? "bank" : "wallet";
    try {
        const user = await (0, walletService_1.ensureUserAndWallet)(targetUser.id, targetUser.tag);
        const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
        const emoji = config.currencyEmoji;
        if (type === "bank") {
            await (0, bankService_1.removeMoneyFromBank)(user.id, amount);
            return message.reply({
                embeds: [(0, embed_1.successEmbed)(message.author, "Money Removed", `Removed **${(0, format_1.fmtCurrency)(amount, emoji)}** from ${targetUser.username}'s **Bank**.`)]
            });
        }
        else {
            await (0, walletService_1.removeMoneyFromWallet)(user.wallet.id, amount);
            return message.reply({
                embeds: [(0, embed_1.successEmbed)(message.author, "Money Removed", `Removed **${(0, format_1.fmtCurrency)(amount, emoji)}** from ${targetUser.username}'s **Wallet**.`)]
            });
        }
    }
    catch (err) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", err.message)] });
    }
}
//# sourceMappingURL=removeMoney.js.map