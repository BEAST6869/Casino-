"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleItemInfo = handleItemInfo;
const discord_js_1 = require("discord.js");
const shopService_1 = require("../../services/shopService");
const guildConfigService_1 = require("../../services/guildConfigService");
const format_1 = require("../../utils/format");
const embed_1 = require("../../utils/embed");
function formatEffectDescription(effect) {
    switch (effect.type) {
        case "ROLE_TEMPORARY":
            return ` **Temporary Role**: <@&${effect.roleId}> for ${(0, format_1.formatDuration)(effect.duration)}`;
        case "ROLE_PERMANENT":
            return ` **Permanent Role**: <@&${effect.roleId}>`;
        case "XP_MULTIPLIER":
            return ` **XP Boost**: ${effect.multiplier}x multiplier for ${(0, format_1.formatDuration)(effect.duration)}`;
        case "LEVEL_BOOST":
            return ` **Level Up**: Instantly gain ${effect.levels} level(s)`;
        case "MONEY":
            return ` **Money**: Receive ${effect.amount} coins`;
        case "CUSTOM_MESSAGE":
            return ` **Message**: "${effect.message}"`;
        default:
            return " Unknown effect";
    }
}
async function handleItemInfo(message, args) {
    try {
        const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
        const emoji = config.currencyEmoji;
        if (args.length === 0) {
            return message.reply(`Usage: \`${config.prefix}iteminfo <item name>\``);
        }
        const itemName = args.join(" ");
        const item = await (0, shopService_1.getShopItemByName)(message.guildId, itemName);
        if (!item) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Not Found", `Item "${itemName}" not found in the shop.`)] });
        }
        const effects = item.effects || [];
        const stockText = item.stock === -1 ? "∞ Unlimited" : `${item.stock} in stock`;
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`<a:BoxBox:1449707866079494154> ${item.name}`)
            .setColor(discord_js_1.Colors.Blue)
            .setDescription(item.description || "*No description provided*")
            .addFields({ name: "<:pricee:1449707707442528387> Price", value: (0, format_1.fmtCurrency)(item.price, emoji), inline: true }, { name: "<a:BoxBox:1449707866079494154> Stock", value: stockText, inline: true });
        if (effects.length > 0) {
            const effectsText = effects.map((e, i) => `${i + 1}. ${formatEffectDescription(e)}`).join("\n");
            embed.addFields({ name: "<:sparks:1449708086099968031> Effects", value: effectsText, inline: false });
        }
        else {
            embed.addFields({ name: "<:sparks:1449708086099968031> Effects", value: "*No special effects*", inline: false });
        }
        embed.setFooter({ text: `Use ${config.prefix}shop buy ${item.name} to purchase` });
        return message.reply({ embeds: [embed] });
    }
    catch (err) {
        console.error("iteminfo error:", err);
        return message.reply("Failed to fetch item information.");
    }
}
//# sourceMappingURL=iteminfo.js.map