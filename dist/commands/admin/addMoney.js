"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAddMoney = handleAddMoney;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const walletService_1 = require("../../services/walletService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format"); // Import
async function handleAddMoney(message, args) {
    // ... (Permission check & args parsing) ...
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Permission", "Administrator required.")] });
    }
    const mention = args[0];
    const amount = Math.floor(Number(args[1] ?? 0));
    if (!mention || !amount || amount <= 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!addmoney @user <amount>`")] });
    }
    const discordId = mention.replace(/[<@!>]/g, "");
    // ... (User fetching & Transaction) ...
    const target = await (0, walletService_1.ensureUserAndWallet)(discordId, "Unknown");
    await prisma_1.default.$transaction([
        // ... (transaction logic) ...
        prisma_1.default.transaction.create({
            data: {
                walletId: target.wallet.id,
                amount,
                type: "admin_add",
                meta: { by: message.author.id },
                isEarned: false
            }
        }),
        prisma_1.default.wallet.update({
            where: { id: target.wallet.id },
            data: { balance: { increment: amount } }
        }),
        prisma_1.default.audit.create({
            data: { guildId: message.guildId ?? undefined, userId: discordId, type: "admin_add", meta: { amount, by: message.author.id } }
        })
    ]);
    // Updated Response
    return message.reply({
        embeds: [(0, embed_1.successEmbed)(message.author, "Added Money", `Added **${(0, format_1.fmtAmount)(amount)}** to <@${discordId}>'s wallet.`)]
    });
}
//# sourceMappingURL=addMoney.js.map