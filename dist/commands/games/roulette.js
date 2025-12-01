"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBet = handleBet;
const walletService_1 = require("../../services/walletService");
const gameService_1 = require("../../services/gameService");
const guildConfigService_1 = require("../../services/guildConfigService"); // Import
const prisma_1 = __importDefault(require("../../utils/prisma"));
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
async function handleBet(message, args) {
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const emoji = config.currencyEmoji;
    // ... (args parsing & game logic) ...
    const amount = Math.floor(Number(args[0] || 0));
    const choiceRaw = (args[1] || "red").toLowerCase();
    if (!amount || amount <= 0)
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Usage: `!bet <amount> <choice>`")] });
    const user = await (0, walletService_1.ensureUserAndWallet)(message.author.id, message.author.tag);
    if (user.wallet.balance < amount)
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Insufficient Funds", "You don't have enough in your wallet.")] });
    // ... (spin logic, red/black check etc.) ...
    const spin = Math.floor(Math.random() * 37);
    // ... check win ...
    // [Assuming you kept the logic from previous steps for spin/win/payout]
    const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    const isRed = redNumbers.has(spin);
    let didWin = false;
    let payout = 0;
    const choice = choiceRaw;
    if (choice === "red") {
        didWin = isRed;
        payout = didWin ? amount * 2 : 0;
    }
    else if (choice === "black") {
        didWin = !isRed && spin !== 0;
        payout = didWin ? amount * 2 : 0;
    }
    else if (choice === "odd") {
        didWin = spin !== 0 && spin % 2 === 1;
        payout = didWin ? amount * 2 : 0;
    }
    else if (choice === "even") {
        didWin = spin !== 0 && spin % 2 === 0;
        payout = didWin ? amount * 2 : 0;
    }
    else {
        const num = Number(choice);
        if (!Number.isNaN(num) && num >= 0 && num <= 36) {
            didWin = spin === num;
            payout = didWin ? amount * 35 : 0;
        }
        else
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Choice", "Red, Black, Odd, Even, or 0-36")] });
    }
    // ... (transaction calls) ...
    try {
        await (0, gameService_1.placeBetWithTransaction)(user.id, user.wallet.id, "roulette", amount, choice, didWin, payout);
    }
    catch (e) {
        await (0, gameService_1.placeBetFallback)(user.wallet.id, user.id, "roulette", amount, choice, didWin, payout);
    }
    const newWallet = await prisma_1.default.wallet.findUnique({ where: { id: user.wallet.id } });
    const newBal = newWallet?.balance ?? 0;
    if (didWin) {
        return message.reply({
            embeds: [(0, embed_1.successEmbed)(message.author, "🎉 You Won!", `Spin: **${spin}**\nPayout: **${(0, format_1.fmtCurrency)(payout, emoji)}**\nNew Balance: **${(0, format_1.fmtCurrency)(newBal, emoji)}**`)]
        });
    }
    else {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "💀 You Lost", `Spin: **${spin}**\nLost: **${(0, format_1.fmtCurrency)(amount, emoji)}**\nNew Balance: **${(0, format_1.fmtCurrency)(newBal, emoji)}**`)]
        });
    }
}
//# sourceMappingURL=roulette.js.map