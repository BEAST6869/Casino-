"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCoinflip = handleCoinflip;
const discord_js_1 = require("discord.js");
const walletService_1 = require("../../services/walletService");
const gameService_1 = require("../../services/gameService");
const guildConfigService_1 = require("../../services/guildConfigService");
const format_1 = require("../../utils/format");
const embed_1 = require("../../utils/embed");
async function handleCoinflip(message, args) {
    // 1. Parse Arguments
    const amountStr = args[0];
    const choiceRaw = (args[1] || "").toLowerCase();
    if (!amountStr || !choiceRaw) {
        return message.reply({
            embeds: [
                (0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!cf <amount> <heads|tails>`"),
            ],
        });
    }
    // 2. Validate Amount
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) {
        return message.reply({
            embeds: [
                (0, embed_1.errorEmbed)(message.author, "Invalid Wager", "Please bet a valid positive amount."),
            ],
        });
    }
    // 3. Validate Choice
    let choice;
    if (["heads", "head", "h"].includes(choiceRaw))
        choice = "heads";
    else if (["tails", "tail", "t"].includes(choiceRaw))
        choice = "tails";
    else {
        return message.reply({
            embeds: [
                (0, embed_1.errorEmbed)(message.author, "Invalid Choice", "Please choose `heads` or `tails`."),
            ],
        });
    }
    // 4. Check Funds
    const user = await (0, walletService_1.ensureUserAndWallet)(message.author.id, message.author.tag);
    if (!user.wallet || user.wallet.balance < amount) {
        return message.reply({
            embeds: [
                (0, embed_1.errorEmbed)(message.author, "Insufficient Funds", "You don't have enough money."),
            ],
        });
    }
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const emoji = config.currencyEmoji; // e.g. "<a:casino_cash:1444352930080882809>"
    // 5. The Flip
    const isHeads = Math.random() < 0.5;
    const result = isHeads ? "heads" : "tails";
    const didWin = choice === result;
    const payout = didWin ? amount * 2 : 0;
    // 6. Database Transaction
    try {
        await (0, gameService_1.placeBetWithTransaction)(user.id, user.wallet.id, "coinflip", amount, choice, didWin, payout);
    }
    catch (e) {
        await (0, gameService_1.placeBetFallback)(user.wallet.id, user.id, "coinflip", amount, choice, didWin, payout);
    }
    // Final wallet balance after this bet
    const finalWalletBalance = user.wallet.balance - amount + payout;
    const finalWalletBalanceIntl = finalWalletBalance.toLocaleString("en-US");
    // Parse emoji ID from custom emoji string like "<a:casino_cash:1444352930080882809>"
    let footerIconURL;
    if (typeof emoji === "string") {
        const match = emoji.match(/\d{17,20}/);
        if (match) {
            footerIconURL = `https://cdn.discordapp.com/emojis/${match[0]}.gif?quality=lossless`;
        }
    }
    // 7. Result Embed
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(didWin ? "🎉 You Won!" : "💀 You Lost")
        .setColor(didWin ? discord_js_1.Colors.Green : discord_js_1.Colors.Red)
        .setThumbnail(didWin
        ? "https://media.tenor.com/d6Jd-9w8eJkAAAAC/success-kid-hell-yeah.gif"
        : null)
        .setDescription(`**You Bet:** ${(0, format_1.fmtCurrency)(amount, emoji)} on \`${choice.toUpperCase()}\`\n` +
        `**The Coin Flipped:** 🪙 \`${result.toUpperCase()}\`\n\n` +
        (didWin
            ? `**Payout:** ${(0, format_1.fmtCurrency)(payout, emoji)}`
            : `**Lost:** ${(0, format_1.fmtCurrency)(amount, emoji)}`))
        .setFooter({
        // no custom emoji text here; just number in international format
        text: `${message.author.username}'s Wallet: ${finalWalletBalanceIntl}`,
        iconURL: footerIconURL, // animated emoji shown here as image
    });
    return message.reply({ embeds: [embed] });
}
//# sourceMappingURL=coinflip.js.map