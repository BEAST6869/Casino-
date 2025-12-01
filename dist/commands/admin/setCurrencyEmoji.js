"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetCurrencyEmoji = handleSetCurrencyEmoji;
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
async function handleSetCurrencyEmoji(message, args) {
    try {
        if (!message.member?.permissions.has("Administrator")) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Permission", "Admins only.")] });
        }
        const newEmoji = args[0];
        if (!newEmoji) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!setemoji <emoji>`")] });
        }
        // Update config
        await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { currencyEmoji: newEmoji });
        return message.reply({
            embeds: [(0, embed_1.successEmbed)(message.author, "Emoji Updated", `Currency emoji set to: ${newEmoji}`)]
        });
    }
    catch (err) {
        console.error("handleSetCurrencyEmoji error:", err);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Internal Error", "Failed to set emoji.")] });
    }
}
//# sourceMappingURL=setCurrencyEmoji.js.map