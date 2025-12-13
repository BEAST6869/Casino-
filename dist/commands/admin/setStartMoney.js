"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetStartMoney = handleSetStartMoney;
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
const permissionUtils_1 = require("../../utils/permissionUtils");
async function handleSetStartMoney(message, args) {
    if (!message.guild)
        return;
    if (!message.member || !(await (0, permissionUtils_1.canExecuteAdminCommand)(message, message.member)))
        return;
    const amountStr = args[0];
    if (!amountStr) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!set - start - money <amount>`")] });
    }
    const amount = (0, format_1.parseSmartAmount)(amountStr);
    if (isNaN(amount) || amount < 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Please provide a valid number.")] });
    }
    await (0, guildConfigService_1.updateGuildConfig)(message.guild.id, { startBalance: amount });
    return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Start Money Updated", `New users will start with ** ${(0, format_1.fmtCurrency)(amount)}**.`)] });
}
//# sourceMappingURL=setStartMoney.js.map