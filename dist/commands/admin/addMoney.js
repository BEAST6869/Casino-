"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAddMoney = handleAddMoney;
const discord_js_1 = require("discord.js");
const prisma_1 = __importDefault(require("../../utils/prisma"));
const walletService_1 = require("../../services/walletService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
const discordLogger_1 = require("../../utils/discordLogger");
const guildConfigService_1 = require("../../services/guildConfigService");
async function handleAddMoney(message, args) {
    if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "You need Administrator permissions.")] });
    }
    const mention = args[0];
    const amount = Math.floor(Number(args[1] ?? 0));
    if (!mention || !amount || amount <= 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!addmoney @user <amount>`")] });
    }
    const discordId = mention.replace(/[<@!>]/g, "");
    const target = await (0, walletService_1.ensureUserAndWallet)(discordId, "Unknown");
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
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
                userId: discordId,
                type: "admin_add",
                meta: { amount, by: message.author.id }
            }
        })
    ]);
    if (updatedWallet) {
        // Log It
        await (0, discordLogger_1.logToChannel)(message.client, {
            guild: message.guild,
            type: "ADMIN",
            title: "Money Added",
            description: `**Admin:** ${message.author.tag} (${message.author.id})\n**Target:** <@${target.discordId}> (${target.discordId})\n**Amount:** +${(0, format_1.fmtCurrency)(amount, config.currencyEmoji)}\n**New Balance:** ${(0, format_1.fmtCurrency)(updatedWallet.balance, config.currencyEmoji)}`,
            color: 0x00FF00
        });
        return message.reply({
            embeds: [(0, embed_1.successEmbed)(message.author, "Money Added", `Added **${(0, format_1.fmtCurrency)(amount, config.currencyEmoji)}** to ${mention}.\nNew Balance: **${(0, format_1.fmtCurrency)(updatedWallet.balance, config.currencyEmoji)}**`)]
        });
    }
}
//# sourceMappingURL=addMoney.js.map