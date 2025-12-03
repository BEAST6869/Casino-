import { Message, EmbedBuilder, Colors } from "discord.js";
import { getUserInventory } from "../../services/shopService";
import { getGuildConfig } from "../../services/guildConfigService";
import { ensureUserAndWallet } from "../../services/walletService";
import { fmtCurrency } from "../../utils/format";
import { errorEmbed } from "../../utils/embed";
import { emojiInline } from "../../utils/emojiRegistry"; 

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
    let emoji = config.currencyEmoji;

    // FIX: Emoji Resolution Logic
    // 1. If it's a raw numeric ID, try to resolve it to a full emoji string.
    if (/^\d+$/.test(emoji)) {
      const resolved = message.guild?.emojis.cache.get(emoji);
      if (resolved) {
        emoji = resolved.toString(); 
      } else {
        // If ID is valid but not found in this server (and not cached), 
        // we fallback to a generic symbol to prevent showing a raw number string.
        emoji = "💰"; 
      }
    }
    // 2. If it is already a full string <...> but renders as text, the bot lacks permission/access.
    // We cannot fix that via code, the admin must set a valid emoji the bot can "see".

    // Get inventory emoji
    const eInv = emojiInline("inventory", message.guild) || "🎒";

    // Fetch Inventory
    const items = await getUserInventory(targetUser.id, message.guildId!);

    if (items.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setTitle(`${eInv} ${targetUser.username}'s Inventory`) 
        .setColor(Colors.Blue)
        .setDescription("Your inventory is empty.\nCheck out the store with `!shop`!")
        .setTimestamp();
      
      return message.reply({ embeds: [emptyEmbed] });
    }

    // Calculate Total Net Worth of items
    const netWorth = items.reduce((sum, slot) => {
        return sum + (slot.shopItem.price * slot.amount);
    }, 0);

    // Format the list
    const displayItems = items.slice(0, 15);
    
    const description = displayItems.map((slot, index) => {
      const item = slot.shopItem;
      return `**${index + 1}. ${item.name}**\n` + 
             `Quantity: \`x${slot.amount}\` • Price: ${fmtCurrency(item.price, emoji)}`;
    }).join("\n\n");

    const embed = new EmbedBuilder()
      .setTitle(`${eInv} ${targetUser.username}'s Inventory`) 
      .setColor(Colors.Blue)
      .setDescription(description)
      // Moved "Total Value" to a Field for better visibility and emoji support reliability
      .addFields({ 
        name: " Total Value", 
        value: fmtCurrency(netWorth, emoji), 
        inline: false 
      })
      .setFooter({ text: items.length > 15 ? `...and ${items.length - 15} more items` : "Page 1" })
      .setTimestamp();

    return message.reply({ embeds: [embed] });

  } catch (err) {
    console.error("Inventory Error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Error", "Failed to fetch inventory.")] });
  }
}