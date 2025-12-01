"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetStartMoney = handleSetStartMoney;
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format"); // Import
async function handleSetStartMoney(message, args) {
    // ... (Permission checks) ...
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Permission", "Admins only.")] });
    }
    const amount = Math.floor(Number(args[0] ?? NaN));
    if (!Number.isFinite(amount) || amount < 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Usage: `!setstartmoney <amount>`")] });
    }
    await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { startMoney: amount });
    // Updated Response
    return message.reply({
        embeds: [(0, embed_1.successEmbed)(message.author, "Start Money Updated", `New starting money set to **${(0, format_1.fmtAmount)(amount)}**`)]
    });
}
//# sourceMappingURL=setStartMoney.js.map