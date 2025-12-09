"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRemoveMoney = handleRemoveMoney;
const discord_js_1 = require("discord.js");
const walletService_1 = require("../../services/walletService");
const bankService_1 = require("../../services/bankService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
const guildConfigService_1 = require("../../services/guildConfigService");
const discordLogger_1 = require("../../utils/discordLogger");
async function handleRemoveMoney(message, args) {
    if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "Admins only.")] });
    }
    const targetUser = message.mentions.users.first();
    // Find the amount argument (first number found that isn't a user ID, though args are split by space so just looking for digits is usually enough, but let's be safe and filter out the mention if it was in args)
    // Actually, a simpler way for this specific command pattern:
    // args usually contains: ["@user", "100", "bank"] or ["100", "@user"]
    // 1. Get Amount: Find the first argument that looks like a number and matches the regex, excluding the mention syntax if possible, but cleaner is just to regex test.
    const amountArg = args.find(arg => /^\d+(,\d+)*$/.test(arg));
    // 2. Get Type: Find "bank" or "wallet"
    const typeArg = args.find(arg => ["bank", "wallet"].includes(arg.toLowerCase()));
    const type = typeArg?.toLowerCase() === "bank" ? "bank" : "wallet";
    if (!targetUser || !amountArg) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!removemoney @user <amount> [wallet/bank]`")]
        });
    }
    const cleanAmount = amountArg.replace(/,/g, "");
    const amount = parseInt(cleanAmount);
    if (isNaN(amount) || amount <= 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Please provide a valid positive number.")] });
    }
    try {
        const user = await (0, walletService_1.ensureUserAndWallet)(targetUser.id, targetUser.tag);
        const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
        const emoji = config.currencyEmoji;
        let newBal;
        if (type === "bank") {
            newBal = await (0, bankService_1.removeMoneyFromBank)(user.id, amount);
            await (0, discordLogger_1.logToChannel)(message.client, {
                guild: message.guild,
                type: "ADMIN",
                title: "Money Removed (Bank)",
                description: `**Admin:** ${message.author.tag}\n**Target:** ${targetUser.tag}\n**Amount:** -${(0, format_1.fmtCurrency)(amount, emoji)}\n**New Bank Balance:** ${(0, format_1.fmtCurrency)(newBal, emoji)}`,
                color: 0xFF0000
            });
            return message.reply({
                embeds: [(0, embed_1.successEmbed)(message.author, "Money Removed", `Removed **${(0, format_1.fmtCurrency)(amount, emoji)}** from ${targetUser.username}'s **Bank**.\nNew Balance: **${(0, format_1.fmtCurrency)(newBal, emoji)}**`)]
            });
        }
        else {
            // removeMoneyFromWallet now returns the new balance
            newBal = await (0, walletService_1.removeMoneyFromWallet)(user.wallet.id, amount);
            await (0, discordLogger_1.logToChannel)(message.client, {
                guild: message.guild,
                type: "ADMIN",
                title: "Money Removed (Wallet)",
                description: `**Admin:** ${message.author.tag}\n**Target:** ${targetUser.tag}\n**Amount:** -${(0, format_1.fmtCurrency)(amount, emoji)}\n**New Wallet Balance:** ${(0, format_1.fmtCurrency)(newBal, emoji)}`,
                color: 0xFF0000
            });
            return message.reply({
                embeds: [(0, embed_1.successEmbed)(message.author, "Money Removed", `Removed **${(0, format_1.fmtCurrency)(amount, emoji)}** from ${targetUser.username}'s **Wallet**.\nNew Balance: **${(0, format_1.fmtCurrency)(newBal, emoji)}**`)]
            });
        }
    }
    catch (err) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", err.message)] });
    }
}
//# sourceMappingURL=removeMoney.js.map