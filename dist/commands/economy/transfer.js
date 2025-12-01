"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTransfer = handleTransfer;
const walletService_1 = require("../../services/walletService");
const transferService_1 = require("../../services/transferService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format"); // Import
async function handleTransfer(message, args) {
    try {
        const amount = Math.floor(Number(args[0] || 0));
        const mention = args[1];
        if (!amount || amount <= 0)
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Usage: `!transfer <amount> @user`")] });
        if (!mention)
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Missing Recipient", "Mention a user to transfer to.")] });
        const toId = mention.replace(/[<@!>]/g, "");
        if (!/^\d+$/.test(toId))
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Mention", "Couldn't parse mention.")] });
        const sender = await (0, walletService_1.ensureUserAndWallet)(message.author.id, message.author.tag);
        try {
            await (0, transferService_1.transferAnyFunds)(sender.wallet.id, toId, amount, message.author.id, message.guildId ?? undefined);
            // Updated response with fmtAmount
            return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Transfer Successful", `Transferred **${(0, format_1.fmtAmount)(amount)}** to <@${toId}>.`)] });
        }
        catch (err) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Transfer Failed", err.message)] });
        }
    }
    catch (err) {
        console.error("handleTransfer error:", err);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Internal Error", "Something went wrong.")] });
    }
}
//# sourceMappingURL=transfer.js.map