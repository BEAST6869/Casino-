"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetCurrency = handleSetCurrency;
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const permissionUtils_1 = require("../../utils/permissionUtils");
async function handleSetCurrency(message, args) {
    try {
        if (!message.member || !(await (0, permissionUtils_1.canExecuteAdminCommand)(message, message.member))) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Permission", "Admins or Bot Commanders only.")] });
        }
        const name = args.join(" ").trim();
        if (!name)
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "`!setcurrency <name>`")] });
        await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { currencyName: name });
        return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Currency Updated", `Currency set to **${name}**`)] });
    }
    catch (err) {
        console.error("handleSetCurrency error:", err);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Internal Error", "Failed to set currency.")] });
    }
}
//# sourceMappingURL=setCurrency.js.map