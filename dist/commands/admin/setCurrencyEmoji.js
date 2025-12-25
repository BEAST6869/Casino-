"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetCurrencyEmoji = handleSetCurrencyEmoji;
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const permissionUtils_1 = require("../../utils/permissionUtils");
async function handleSetCurrencyEmoji(message, args) {
    try {
        if (!message.member || !(await (0, permissionUtils_1.canExecuteAdminCommand)(message, message.member))) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Permission", "Admins or Bot Commanders only.")] });
        }
        const input = args[0];
        if (!input) {
            const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", `Usage: \`${config.prefix}setemoji <emoji_name | emoji_id | emoji>\``)] });
        }
        let finalEmoji = input;
        const guildEmojis = message.guild?.emojis.cache;
        if (/^\d+$/.test(input)) {
            const foundEmoji = guildEmojis?.get(input);
            if (foundEmoji) {
                finalEmoji = foundEmoji.toString();
            }
            else {
                return message.reply({
                    embeds: [(0, embed_1.errorEmbed)(message.author, "Not Found", `Emoji ID \`${input}\` not found in this server.`)]
                });
            }
        }
        else if (/^[a-zA-Z0-9_]+$/.test(input)) {
            const foundEmoji = guildEmojis?.find(e => e.name === input);
            if (foundEmoji) {
                finalEmoji = foundEmoji.toString();
            }
            else {
                return message.reply({
                    embeds: [(0, embed_1.errorEmbed)(message.author, "Not Found", `Emoji named \`${input}\` not found in this server.`)]
                });
            }
        }
        await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { currencyEmoji: finalEmoji });
        return message.reply({
            embeds: [(0, embed_1.successEmbed)(message.author, "Emoji Updated", `Currency emoji set to: ${finalEmoji}`)]
        });
    }
    catch (err) {
        console.error("handleSetCurrencyEmoji error:", err);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Internal Error", "Failed to set emoji.")] });
    }
}
//# sourceMappingURL=setCurrencyEmoji.js.map