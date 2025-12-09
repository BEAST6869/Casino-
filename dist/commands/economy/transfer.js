"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTransfer = handleTransfer;
const walletService_1 = require("../../services/walletService");
const transferService_1 = require("../../services/transferService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
const discordLogger_1 = require("../../utils/discordLogger");
const guildConfigService_1 = require("../../services/guildConfigService");
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
            const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
            // Log Transfer
            await (0, discordLogger_1.logToChannel)(message.client, {
                guild: message.guild,
                type: "ECONOMY",
                title: "Transfer",
                description: `**From:** <@${sender.discordId}>\n**To:** <@${toId}>\n**Amount:** ${(0, format_1.fmtCurrency)(amount, config.currencyEmoji)}`,
                color: 0x00FFFF
            });
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