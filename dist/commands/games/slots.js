"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSlots = handleSlots;
const discord_js_1 = require("discord.js");
const walletService_1 = require("../../services/walletService");
const gameService_1 = require("../../services/gameService");
const guildConfigService_1 = require("../../services/guildConfigService");
const format_1 = require("../../utils/format");
const embed_1 = require("../../utils/embed");
const format_2 = require("../../utils/format");
// Custom Emojis for Slots
const CHERRY = "<:cherri:1446428169786622053>";
const BANANA = "<:banano:1446428190837968989>";
const GRAPES = "<:graps:1446428294483542040>";
const MELON = "<:watermelon2:1446428567402709115>";
const BELL = "<:Bel:1446428665176129716>";
const GEM = "<:Gemm:1446428771266592819>";
const SEVEN = "<:sevenn:1446428916867661846>";
const SYMBOLS = [CHERRY, BANANA, GRAPES, MELON, BELL, GEM, SEVEN];
// Multipliers based on rarity/value
const MULTIPLIERS = {
    [CHERRY]: 2,
    [BANANA]: 2,
    [GRAPES]: 3,
    [MELON]: 3,
    [BELL]: 5,
    [GEM]: 10,
    [SEVEN]: 20
};
async function handleSlots(message, args) {
    const amountStr = args[0];
    if (!amountStr) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!slots <amount>`")] });
    }
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Wager", "Please bet a valid positive amount.")] });
    }
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const emoji = config.currencyEmoji;
    const minBet = config.minBet;
    // Check Minimum Bet
    if (amount < minBet) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Bet Too Low", `The minimum bet is **${(0, format_1.fmtCurrency)(minBet, emoji)}**.`)]
        });
    }
    // Check Cooldown
    const cooldowns = config.gameCooldowns || {};
    const cdSeconds = cooldowns["slots"] || 0;
    if (cdSeconds > 0) {
        const { checkCooldown } = require("../../utils/cooldown"); // Inline import to avoid circular dependency if any, or just import at top.
        // Actually, importing at top is better. I will add import in separate block if needed, but here simple usage.
        // Using global/user specific key
        const now = Date.now();
        const key = `game:slots:${message.guildId}:${message.author.id}`;
        const remaining = checkCooldown(key, cdSeconds);
        if (remaining > 0) {
            return message.reply({
                embeds: [(0, embed_1.errorEmbed)(message.author, "Cooldown Active", `⏳ Please wait **${(0, format_2.formatDuration)(remaining * 1000)}** before playing Slots again.`)]
            });
        }
    }
    const user = await (0, walletService_1.ensureUserAndWallet)(message.author.id, message.author.tag);
    if (user.wallet.balance < amount) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Insufficient Funds", "You don't have enough money.")] });
    }
    // --- Spin Logic ---
    // Randomly select symbols for each reel
    const reel1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const reel2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const reel3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    let win = false;
    let payout = 0;
    let multiplier = 0;
    // Check for win (all 3 match)
    if (reel1 === reel2 && reel2 === reel3) {
        win = true;
        multiplier = MULTIPLIERS[reel1];
        payout = amount * multiplier;
    }
    // Transaction
    try {
        await (0, gameService_1.placeBetWithTransaction)(user.id, user.wallet.id, "slots", amount, "spin", win, payout);
    }
    catch (e) {
        await (0, gameService_1.placeBetFallback)(user.wallet.id, user.id, "slots", amount, "spin", win, payout);
    }
    // Result Embed
    // Using the animated casino cash emoji for the title as requested
    const eTitle = "<a:casino:1445732641545654383>";
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`${eTitle} Slots`)
        .setColor(win ? discord_js_1.Colors.Green : discord_js_1.Colors.Red)
        .setDescription(`**[ ${reel1} | ${reel2} | ${reel3} ]**\n\n` +
        (win
            ? `**JACKPOT!** You won **${(0, format_1.fmtCurrency)(payout, emoji)}**! (x${multiplier})`
            : `Better luck next time... You lost **${(0, format_1.fmtCurrency)(amount, emoji)}**.`))
        // Footer shows only the numeric balance (clean look)
        .setFooter({ text: `${message.author.username}'s Wallet: ${(user.wallet.balance - amount) + payout}` });
    return message.reply({ embeds: [embed] });
}
//# sourceMappingURL=slots.js.map