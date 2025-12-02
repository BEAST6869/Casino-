"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAddShopItem = handleAddShopItem;
const shopService_1 = require("../../services/shopService");
const embed_1 = require("../../utils/embed");
async function handleAddShopItem(message, args) {
    if (!message.member?.permissions.has("Administrator"))
        return;
    // Usage: !shopadd <price> <name>
    // Simplified for now because parsing "description" with spaces is hard in simple text cmds
    const price = parseInt(args[0]);
    const name = args.slice(1).join(" ");
    if (!price || !name) {
        return message.reply("Usage: `!shopadd <price> <item name>`");
    }
    try {
        await (0, shopService_1.createShopItem)(message.guildId, name, price, "No description set.");
        return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Item Added", `Added **${name}** for **${price}**`)] });
    }
    catch (err) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "Failed to create item.")] });
    }
}
//# sourceMappingURL=addShopItem.js.map