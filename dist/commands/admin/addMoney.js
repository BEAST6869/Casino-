"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAddMoney = handleAddMoney;
const discord_js_1 = require("discord.js");
const prisma_1 = __importDefault(require("../../utils/prisma"));
const walletService_1 = require("../../services/walletService");
const bankService_1 = require("../../services/bankService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
const discordLogger_1 = require("../../utils/discordLogger");
const guildConfigService_1 = require("../../services/guildConfigService");
async function handleAddMoney(message, args) {
    if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "You need Administrator permissions.")] });
    }
    const mention = args[0];
    const amountStr = args[1]; // Keep amountStr for the original error message if needed, though it's replaced by parseSmartAmount
    // Arg[0] = target, Arg[1] = amount
    const targetId = args[0].replace(/[<@!>]/g, "");
    const amount = (0, format_1.parseSmartAmount)(args[1]); // Default max is Infinity
    // Parse optional type argument (default to wallet)
    // Logic: check args[2] if it exists
    const typeArg = args[2]?.toLowerCase();
    const targetType = typeArg === "bank" ? "bank" : "wallet"; // Default wallet
    if (isNaN(amount) || amount <= 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Usage: `!add-money @user <amount> [wallet/bank]`")] });
    }
    const discordId = mention.replace(/[<@!>]/g, "");
    // Ensure user exists first
    const target = await (0, walletService_1.ensureUserAndWallet)(discordId, "Unknown");
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const emoji = config.currencyEmoji;
    // We need to fetch the target user's ID for log details if not available on 'target' object (it is available as target.discordId or target.id)
    if (targetType === "bank") {
        // BANK ADDITION
        const bank = await (0, bankService_1.ensureBankForUser)(target.id);
        // We need walletId for the transaction entry even if it's a bank, 
        // though for strict correctness we might want a bank-specific transaction log or link to wallet ID.
        // The schema links transactions to Wallet. So we link it to the user's wallet ID.
        const [_, updatedBank] = await prisma_1.default.$transaction([
            prisma_1.default.transaction.create({
                data: {
                    walletId: target.wallet.id,
                    amount,
                    type: "admin_add_bank",
                    meta: { by: message.author.id },
                    isEarned: false
                }
            }),
            prisma_1.default.bank.update({
                where: { id: bank.id },
                data: { balance: { increment: amount } }
            }),
            prisma_1.default.audit.create({
                data: {
                    guildId: message.guildId ?? undefined,
                    userId: target.id,
                    type: "admin_add",
                    meta: { amount, target: "bank", by: message.author.id }
                }
            })
        ]);
        // Log It
        await (0, discordLogger_1.logToChannel)(message.client, {
            guild: message.guild,
            type: "ADMIN",
            title: "Money Added (Bank)",
            description: `**Admin:** ${message.author.tag} (${message.author.id})\n**Target:** <@${target.discordId}>\n**Amount:** +${(0, format_1.fmtCurrency)(amount, emoji)}\n**New Bank Balance:** ${(0, format_1.fmtCurrency)(updatedBank.balance, emoji)}`,
            color: 0x00FF00
        });
        return message.reply({
            embeds: [(0, embed_1.successEmbed)(message.author, "Money Added", `Added **${(0, format_1.fmtCurrency)(amount, emoji)}** to ${mention}'s **Bank**.\nNew Balance: **${(0, format_1.fmtCurrency)(updatedBank.balance, emoji)}**`)]
        });
    }
    else {
        // WALLET ADDITION (Default)
        const [_, updatedWallet] = await prisma_1.default.$transaction([
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
                data: {
                    guildId: message.guildId ?? undefined,
                    userId: target.id, // ObjectId
                    type: "admin_add",
                    meta: { amount, target: "wallet", by: message.author.id }
                }
            })
        ]);
        if (updatedWallet) {
            // Log It
            await (0, discordLogger_1.logToChannel)(message.client, {
                guild: message.guild,
                type: "ADMIN",
                title: "Money Added (Wallet)",
                description: `**Admin:** ${message.author.tag} (${message.author.id})\n**Target:** <@${target.discordId}>\n**Amount:** +${(0, format_1.fmtCurrency)(amount, emoji)}\n**New Wallet Balance:** ${(0, format_1.fmtCurrency)(updatedWallet.balance, emoji)}`,
                color: 0x00FF00
            });
            return message.reply({
                embeds: [(0, embed_1.successEmbed)(message.author, "Money Added", `Added **${(0, format_1.fmtCurrency)(amount, emoji)}** to ${mention}'s **Wallet**.\nNew Balance: **${(0, format_1.fmtCurrency)(updatedWallet.balance, emoji)}**`)]
            });
        }
    }
}
//# sourceMappingURL=addMoney.js.map