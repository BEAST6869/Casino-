"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDepositBank = handleDepositBank;
const walletService_1 = require("../../services/walletService");
const bankService_1 = require("../../services/bankService");
const embed_1 = require("../../utils/embed");
async function handleDepositBank(message, args) {
    const amount = parseInt(args[0]);
    if (!amount || amount <= 0)
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid", "Enter a valid amount.")] });
    const user = await (0, walletService_1.ensureUserAndWallet)(message.author.id, message.author.tag);
    try {
        await (0, bankService_1.depositToBank)(user.wallet.id, user.id, amount);
        const bank = await (0, bankService_1.getBankByUserId)(user.id);
        return message.reply({
            embeds: [
                (0, embed_1.successEmbed)(message.author, "Bank Deposit", `Deposited **${amount}**.\nBank Balance: **${bank?.balance}**`)
            ]
        });
    }
    catch (err) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Failed", err.message)]
        });
    }
}
//# sourceMappingURL=depositBank.js.map