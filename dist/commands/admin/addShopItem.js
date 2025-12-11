"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAddShopItem = handleAddShopItem;
const shopService_1 = require("../../services/shopService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
async function handleAddShopItem(message, args) {
    if (!message.member?.permissions.has("Administrator"))
        return;
    // Usage: !shopadd <price> <name>
    // Simplified for now because parsing "description" with spaces is hard in simple text cmds
    const name = args[0];
    const price = (0, format_1.parseSmartAmount)(args[1]);
    if (!name || isNaN(price) || price <= 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!add-shop-item <name> <price> [desc] [stock] [roleID]`")] });
    }
    try {
        await (0, shopService_1.createShopItem)(message.guildId, name, price, "No description set.");
        return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Item Added", `Added **${name}** for **${(0, format_1.fmtCurrency)(price)}**`)] });
    }
    catch (err) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "Failed to create item.")] });
    }
}
//# sourceMappingURL=addShopItem.js.map