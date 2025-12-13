"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAddEmoji = handleAddEmoji;
const emojiRegistry_1 = require("../../utils/emojiRegistry");
const embed_1 = require("../../utils/embed");
const permissionUtils_1 = require("../../utils/permissionUtils");
async function handleAddEmoji(message, args) {
    try {
        if (!message.member || !(await (0, permissionUtils_1.canExecuteAdminCommand)(message, message.member))) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No permission", "Admins or Bot Commanders only.")] });
        }
        const key = args[0];
        const emojiArg = args[1];
        if (!key || !emojiArg) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Usage", "`!addemoji <key> <emoji|id>`")] });
        }
        const mentionMatch = emojiArg.match(/<?a?:?(\w+):(\d+)>?/);
        let id;
        let name;
        if (mentionMatch) {
            name = mentionMatch[1];
            id = mentionMatch[2];
        }
        else if (/^\d+$/.test(emojiArg)) {
            id = emojiArg;
        }
        else {
            const found = message.client.emojis.cache.find(e => e.name === emojiArg);
            if (found) {
                id = found.id;
                name = found.name;
            }
        }
        if (!id) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid emoji", "Please provide a valid emoji mention or id")] });
        }
        const cached = message.client.emojis.cache.get(id);
        const animated = !!cached?.animated;
        const rec = { id, name: name ?? cached?.name ?? key, animated };
        (0, emojiRegistry_1.setPersistedEmoji)(key, rec);
        return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Emoji mapped", `Key \`${key}\` → emoji id \`${id}\``)] });
    }
    catch (err) {
        console.error("handleAddEmoji error:", err);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "Failed to map emoji")] });
    }
}
//# sourceMappingURL=addEmoji.js.map