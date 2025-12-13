"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBalance = handleBalance;
const walletService_1 = require("../../services/walletService");
const bankService_1 = require("../../services/bankService");
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
async function handleBalance(message) {
    let targetUser = message.mentions.users.first();
    if (!targetUser) {
        targetUser = message.author;
    }
    if (targetUser.bot) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "Bots do not have wallets.")]
        });
    }
    const user = await (0, walletService_1.ensureUserAndWallet)(targetUser.id, message.guildId, targetUser.tag);
    const bank = await (0, bankService_1.getBankByUserId)(user.id);
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    return message.reply({
        embeds: [
            (0, embed_1.balanceEmbed)(targetUser, user.wallet.balance, bank?.balance ?? 0, config.currencyEmoji, config.walletLimit, config.bankLimit)
        ]
    });
}
//# sourceMappingURL=balance.js.map