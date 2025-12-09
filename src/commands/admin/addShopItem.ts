import { Message } from "discord.js";
import { createShopItem } from "../../services/shopService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { parseSmartAmount, fmtCurrency } from "../../utils/format";

export async function handleAddShopItem(message: Message, args: string[]) {
  if (!message.member?.permissions.has("Administrator")) return;

  // Usage: !shopadd <price> <name>
  // Simplified for now because parsing "description" with spaces is hard in simple text cmds
  const name = args[0];
  const price = parseSmartAmount(args[1]);

  if (!name || isNaN(price) || price <= 0) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!add-shop-item <name> <price> [desc] [stock] [roleID]`")] });
  }

  try {
    await createShopItem(message.guildId!, name, price, "No description set.");
    return message.reply({ embeds: [successEmbed(message.author, "Item Added", `Added **${name}** for **${price}**`)] });
  } catch (err) {
    return message.reply({ embeds: [errorEmbed(message.author, "Error", "Failed to create item.")] });
  }
}