"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRemoveMoney = handleRemoveMoney;
const walletService_1 = require("../../services/walletService");
const bankService_1 = require("../../services/bankService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
const guildConfigService_1 = require("../../services/guildConfigService");
const discordLogger_1 = require("../../utils/discordLogger");
const prisma_1 = __importDefault(require("../../utils/prisma"));
const permissionUtils_1 = require("../../utils/permissionUtils");
async function handleRemoveMoney(message, args) {
    if (!message.member || !(await (0, permissionUtils_1.canExecuteAdminCommand)(message, message.member))) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "You need Administrator or Bot Commander permissions.")] });
    }
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const emoji = config.currencyEmoji;
    const targetUser = message.mentions.users.first();
    const amountArg = args[1];
    const typeArg = args[2]?.toLowerCase() || "wallet";
    const type = typeArg === "bank" ? "bank" : "wallet";
    if (!targetUser) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", `Usage: \`${config.prefix}removemoney @user <amount|all|%> [wallet/bank]\``)]
        });
    }
    if (!amountArg) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Please specify an amount, percentage, or 'all'.")]
        });
    }
    const isAllAmount = /^(all|everyone)$/i.test(amountArg);
    const isPercentage = amountArg.includes("%");
    let value = 0;
    if (!isAllAmount) {
        if (isPercentage) {
            value = parseFloat(amountArg.replace(/,/g, "").replace("%", ""));
        }
        else {
            value = (0, format_1.parseSmartAmount)(amountArg);
        }
        if (isNaN(value) || value <= 0) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Please provide a valid positive number.")] });
        }
    }
    try {
        const user = await (0, walletService_1.ensureUserAndWallet)(targetUser.id, message.guildId, targetUser.tag);
        let removeAmount = 0;
        let newBal = 0;
        if (type === "bank") {
            const bank = await prisma_1.default.bank.findUnique({ where: { userId: user.id } });
            const currentBal = bank?.balance || 0;
            if (isAllAmount) {
                removeAmount = currentBal;
            }
            else if (isPercentage) {
                if (value > 100)
                    return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "Cannot remove more than 100%.")] });
                removeAmount = Math.floor(currentBal * (value / 100));
            }
            else {
                removeAmount = value;
            }
            if (removeAmount <= 0 && currentBal > 0) {
                removeAmount = 0;
            }
            if (removeAmount > 0) {
                newBal = await (0, bankService_1.removeMoneyFromBank)(user.id, removeAmount);
            }
            else {
                newBal = currentBal;
            }
            await (0, discordLogger_1.logToChannel)(message.client, {
                guild: message.guild,
                type: "ADMIN",
                title: "Money Removed (Bank)",
                description: `**Admin:** ${message.author.tag}\n**Target:** ${targetUser.tag}\n**Amount:** -${(0, format_1.fmtCurrency)(removeAmount, emoji)} (${amountArg})\n**New Balance:** ${(0, format_1.fmtCurrency)(newBal, emoji)}`,
                color: 0xFF0000
            });
            return message.reply({
                embeds: [(0, embed_1.successEmbed)(message.author, "Money Removed", `Removed **${(0, format_1.fmtCurrency)(removeAmount, emoji)}** from ${targetUser.username}'s **Bank**.\nNew Balance: **${(0, format_1.fmtCurrency)(newBal, emoji)}**`)]
            });
        }
        else {
            const currentBal = user.wallet?.balance || 0;
            if (isAllAmount) {
                removeAmount = currentBal;
            }
            else if (isPercentage) {
                if (value > 100)
                    return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "Cannot remove more than 100%.")] });
                removeAmount = Math.floor(currentBal * (value / 100));
            }
            else {
                removeAmount = value;
            }
            if (removeAmount > 0) {
                newBal = await (0, walletService_1.removeMoneyFromWallet)(user.wallet.id, removeAmount);
            }
            else {
                newBal = currentBal;
            }
            await (0, discordLogger_1.logToChannel)(message.client, {
                guild: message.guild,
                type: "ADMIN",
                title: "Money Removed (Wallet)",
                description: `**Admin:** ${message.author.tag}\n**Target:** ${targetUser.tag}\n**Amount:** -${(0, format_1.fmtCurrency)(removeAmount, emoji)} (${amountArg})\n**New Balance:** ${(0, format_1.fmtCurrency)(newBal, emoji)}`,
                color: 0xFF0000
            });
            return message.reply({
                embeds: [(0, embed_1.successEmbed)(message.author, "Money Removed", `Removed **${(0, format_1.fmtCurrency)(removeAmount, emoji)}** from ${targetUser.username}'s **Wallet**.\nNew Balance: **${(0, format_1.fmtCurrency)(newBal, emoji)}**`)]
            });
        }
    }
    catch (err) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", err.message)] });
    }
}
//# sourceMappingURL=removeMoney.js.map