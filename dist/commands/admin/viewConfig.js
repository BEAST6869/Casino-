"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAdminViewConfig = handleAdminViewConfig;
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
async function handleAdminViewConfig(message, args) {
    try {
        if (!message.member?.permissions.has("Administrator")) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Permission", "Admins only.")] });
        }
        const cfg = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
        const desc = `
**Currency:** ${cfg.currencyName}
**Start Money:** ${cfg.startMoney}
**Transfer Tax:** ${cfg.transferTax}%
**Income Tax:** ${cfg.incomeTax}%
**Bank Limit:** ${cfg.bankLimit}
**Interest Rate (daily):** ${cfg.interestRate}%
    `.trim();
        return message.reply({ embeds: [(0, embed_1.infoEmbed)(message.author, "Guild Economy Settings", desc)] });
    }
    catch (err) {
        console.error("handleAdminViewConfig error:", err);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Internal Error", "Failed to fetch config.")] });
    }
}
//# sourceMappingURL=viewConfig.js.map