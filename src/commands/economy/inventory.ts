import { Message, EmbedBuilder, Colors } from "discord.js";
import { getUserInventory } from "../../services/shopService";
import { getGuildConfig } from "../../services/guildConfigService";
import { ensureUserAndWallet } from "../../services/walletService";
import { fmtCurrency } from "../../utils/format";
import { errorEmbed } from "../../utils/embed";

export async function handleInventory(message: Message, args: string[]) {
  try {
    // Allow checking other users: !inv @user
    let targetUser = message.mentions.users.first() || message.author;

    if (targetUser.bot) {
      return message.reply({ embeds: [errorEmbed(message.author, "Error", "Bots cannot hold items.")] });
    }

    // Ensure the target user exists in DB
    await ensureUserAndWallet(targetUser.id, targetUser.tag);

    const config = await getGuildConfig(message.guildId!);
    const emoji = config.currencyEmoji;

    // Fetch Inventory
    const items = await getUserInventory(targetUser.id, message.guildId!);

    if (items.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setTitle(`🎒 ${targetUser.username}'s Inventory`)
        .setColor(Colors.Blue)
        .setDescription("Your inventory is empty.\nCheck out the store with `!shop`!")
        .setTimestamp();
      
      return message.reply({ embeds: [emptyEmbed] });
    }

    // Calculate Total Net Worth of items
    const netWorth = items.reduce((sum, slot) => sum + (slot.shopItem.price * slot.amount), 0);

    // Format the list
    // Lists top 15 items to prevent embed overflow (simple version)
    // You can add pagination later if users have tons of unique items
    const displayItems = items.slice(0, 15);
    
    const description = displayItems.map((slot, index) => {
      const item = slot.shopItem;
      return `**${index + 1}. ${item.name}**\n` + 
             `Quantity: \`x${slot.amount}\` • Price: ${fmtCurrency(item.price, emoji)}`;
    }).join("\n\n");

    const embed = new EmbedBuilder()
      .setTitle(`🎒 ${targetUser.username}'s Inventory`)
      .setColor(Colors.Blue)
      .setDescription(description)
      .setFooter({ text: `Total Value: ${fmtCurrency(netWorth, emoji)} ${items.length > 15 ? `• And ${items.length - 15} more...` : ''}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });

  } catch (err) {
    console.error("Inventory Error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Error", "Failed to fetch inventory.")] });
  }
}