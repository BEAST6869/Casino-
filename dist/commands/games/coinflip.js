"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCoinflip = handleCoinflip;
const discord_js_1 = require("discord.js");
const walletService_1 = require("../../services/walletService");
const gameService_1 = require("../../services/gameService");
const guildConfigService_1 = require("../../services/guildConfigService");
const format_1 = require("../../utils/format");
const embed_1 = require("../../utils/embed");
const cooldown_1 = require("../../utils/cooldown");
const format_2 = require("../../utils/format");
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
    const user = await (0, walletService_1.ensureUserAndWallet)(message.author.id, message.author.tag);
    const amount = (0, format_1.parseBetAmount)(amountStr, user.wallet.balance);
    // 2. Validate Amount
    if (isNaN(amount) || amount <= 0) {
        return message.reply({
            embeds: [
                (0, embed_1.errorEmbed)(message.author, "Invalid Wager", "Please bet a valid positive amount."),
            ],
        });
    }
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const emoji = config.currencyEmoji;
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
    // Check Cooldown
    const cooldowns = config.gameCooldowns || {};
    const cdSeconds = cooldowns["cf"] || 0;
    if (cdSeconds > 0) {
        const key = `game:cf:${message.guildId}:${message.author.id}`;
        const remaining = (0, cooldown_1.checkCooldown)(key, cdSeconds);
        if (remaining > 0) {
            return message.reply({
                embeds: [(0, embed_1.errorEmbed)(message.author, "Cooldown Active", `⏳ Please wait **${(0, format_2.formatDuration)(remaining * 1000)}** before flipping again.`)]
            });
        }
    }
    // Refetch to be safe? Or just use existing.
    // const user = await ensureUserAndWallet... -> We already have user.
    // If we really need to refetch:
    // user = await ... (but user is const)
    // Let's assume user from line 27 is fine or define a new variable if logic demanded refresh.
    // Given standard logic, just using 'user' is fine.
    if (!user.wallet || user.wallet.balance < amount) {
        return message.reply({
            embeds: [
                (0, embed_1.errorEmbed)(message.author, "Insufficient Funds", "You don't have enough money."),
            ],
        });
    }
    // 5. The Flip
    const isHeads = Math.random() < 0.5;
    const result = isHeads ? "heads" : "tails";
    const didWin = choice === result;
    let payout = didWin ? amount * 2 : 0;
    // 6. Database Transaction
    let actualPayout = payout;
    try {
        actualPayout = await (0, gameService_1.placeBetWithTransaction)(user.id, user.wallet.id, "coinflip", amount, choice, didWin, payout, message.guildId);
    }
    catch (e) {
        actualPayout = await (0, gameService_1.placeBetFallback)(user.wallet.id, user.id, "coinflip", amount, choice, didWin, payout, message.guildId);
    }
    // Use actual payout for display
    payout = actualPayout;
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