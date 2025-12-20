"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUse = handleUse;
const shopService_1 = require("../../services/shopService");
const embed_1 = require("../../utils/embed");
async function handleUse(message, args) {
    if (!message.guild || !message.member)
        return;
    const itemName = args.join(" ");
    if (!itemName) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!use <item_name>`")]
        });
    }
    try {
        const { item, results } = await (0, shopService_1.useItem)(message.author.id, message.guildId, itemName, message.member);
        const customMessages = results
            .filter(r => r.type === "CUSTOM_MESSAGE")
            .map(r => r.message);
        const otherEffects = results
            .filter(r => r.type !== "CUSTOM_MESSAGE")
            .map(r => r.message);
        // Send custom messages first (plain text)
        if (customMessages.length > 0) {
            await message.channel.send(customMessages.join("\n"));
        }
        // Send the embed with remaining effects
        const embed = (0, embed_1.successEmbed)(message.author, `Used: ${item.name}`, otherEffects.length > 0 ? otherEffects.join("\n") : "✨ Item used successfully!");
        return message.reply({ embeds: [embed] });
    }
    catch (err) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Error", err.message || "Failed to use item.")]
        });
    }
}
//# sourceMappingURL=use.js.map