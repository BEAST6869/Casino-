"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleResetEconomy = handleResetEconomy;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const embed_1 = require("../../utils/embed");
const discordLogger_1 = require("../../utils/discordLogger");
const permissionUtils_1 = require("../../utils/permissionUtils");
const guildConfigService_1 = require("../../services/guildConfigService");
async function handleResetEconomy(message, args) {
    try {
        if (!message.member || !(await (0, permissionUtils_1.canExecuteAdminCommand)(message, message.member))) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Permission", "Admins or Bot Commanders only.")] });
        }
        const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
        const token = args[0]?.toLowerCase();
        if (token !== "confirm") {
            return message.reply({
                embeds: [(0, embed_1.errorEmbed)(message.author, "Confirmation Required", `This will wipe wallets, banks, transactions and audits. Run \`${config.prefix}reseteconomy confirm\` to proceed.`)]
            });
        }
        try {
            await prisma_1.default.$transaction([
                prisma_1.default.transaction.deleteMany({}),
                prisma_1.default.audit.deleteMany({}),
                prisma_1.default.wallet.updateMany({ data: { balance: 0 } }),
                prisma_1.default.bank.updateMany({ data: { balance: 0 } }),
                prisma_1.default.inventory.deleteMany({}),
                prisma_1.default.marketListing.deleteMany({})
            ]);
            await (0, discordLogger_1.logToChannel)(message.client, {
                guild: message.guild,
                type: "ADMIN",
                title: "🔥 ECONOMY RESET 🔥",
                description: `**Admin:** ${message.author.tag} (${message.author.id})\n\nALL user data, wallets, banks, investments, and items were wiped.`,
                color: 0x000000
            });
            return message.reply({
                embeds: [(0, embed_1.successEmbed)(message.author, "Economy Reset", "All wallets, banks, inventories & items zeroed; transactions & audits deleted.")]
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