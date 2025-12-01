"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleResetEconomy = handleResetEconomy;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const embed_1 = require("../../utils/embed");
async function handleResetEconomy(message, args) {
    try {
        if (!message.member?.permissions.has("Administrator")) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Permission", "Admins only.")] });
        }
        // require explicit confirm token
        const token = args[0]?.toLowerCase();
        if (token !== "confirm") {
            return message.reply({
                embeds: [(0, embed_1.errorEmbed)(message.author, "Confirmation Required", "This will wipe wallets, banks, transactions and audits. Run `!reseteconomy confirm` to proceed.")]
            });
        }
        // perform destructive reset: set wallet/bank balances to 0, delete transactions and audits
        // Wrapping in a try/catch
        try {
            // Note: large collections may require batching; this does a deleteMany which works for reasonable datasets.
            await prisma_1.default.$transaction([
                prisma_1.default.transaction.deleteMany({}),
                prisma_1.default.audit.deleteMany({}),
                prisma_1.default.wallet.updateMany({ data: { balance: 0 } }),
                prisma_1.default.bank.updateMany({ data: { balance: 0 } })
            ]);
            return message.reply({
                embeds: [(0, embed_1.successEmbed)(message.author, "Economy Reset", "All wallets & banks zeroed; transactions & audits deleted.")]
            });
        }
        catch (innerErr) {
            console.error("Reset transaction failed:", innerErr);
            return message.reply({
                embeds: [(0, embed_1.errorEmbed)(message.author, "Reset Failed", "Failed while resetting. Check server logs.")]
            });
        }
    }
    catch (err) {
        console.error("handleResetEconomy error:", err);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Internal Error", "Failed to reset economy.")] });
    }
}
//# sourceMappingURL=resetEconomy.js.map