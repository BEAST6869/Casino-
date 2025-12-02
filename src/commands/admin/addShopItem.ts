import { Message } from "discord.js";
import { createShopItem } from "../../services/shopService";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleAddShopItem(message: Message, args: string[]) {
  if (!message.member?.permissions.has("Administrator")) return;

  // Usage: !shopadd <price> <name>
  // Simplified for now because parsing "description" with spaces is hard in simple text cmds
  const price = parseInt(args[0]);
  const name = args.slice(1).join(" ");

  if (!price || !name) {
    return message.reply("Usage: `!shopadd <price> <item name>`");
  }

  try {
    await createShopItem(message.guildId!, name, price, "No description set.");
    return message.reply({ embeds: [successEmbed(message.author, "Item Added", `Added **${name}** for **${price}**`)] });
  } catch (err) {
    return message.reply({ embeds: [errorEmbed(message.author, "Error", "Failed to create item.")] });
  }
}