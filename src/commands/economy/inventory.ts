
import { Message, EmbedBuilder, Colors, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { getUserInventory } from "../../services/shopService";
import { getGuildConfig } from "../../services/guildConfigService";
import { ensureUserAndWallet } from "../../services/walletService";
import { fmtCurrency } from "../../utils/format";
import { errorEmbed } from "../../utils/embed";
import { emojiInline } from "../../utils/emojiRegistry";

export async function handleInventory(message: Message, args: string[]) {
  try {
    let targetUser = message.mentions.users.first() || message.author;

    if (targetUser.bot) {
      return message.reply({ embeds: [errorEmbed(message.author, "Error", "Bots cannot hold items.")] });
    }

    await ensureUserAndWallet(targetUser.id, targetUser.tag);

    const config = await getGuildConfig(message.guildId!);
    let emoji = config.currencyEmoji;

    // Emoji Resolution
    if (/^\d+$/.test(emoji)) {
      const resolved = message.guild?.emojis.cache.get(emoji);
      emoji = resolved ? resolved.toString() : "💰";
    }

    const items = await getUserInventory(targetUser.id, message.guildId!);
    const eInv = emojiInline("inventory", message.guild) || "🎒";

    // 1. Empty Inventory
    if (items.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setTitle(`${eInv} ${targetUser.username}'s Inventory`)
        .setColor(Colors.Blue)
        .setDescription("Your inventory is empty.\nCheck out the store with `!shop`!")
        .setTimestamp();
      return message.reply({ embeds: [emptyEmbed] });
    }

    // 2. Net Worth
    const netWorth = items.reduce((sum, slot) => sum + (slot.shopItem.price * slot.amount), 0);

    // 3. Build Select Menu Options
    // Limit to 25 items for Select Menu (Discord Limit)
    const options = items.slice(0, 25).map(slot => ({
      label: `${slot.shopItem.name} (x${slot.amount})`,
      description: `Value: ${slot.shopItem.price} | Quick Sell: ${Math.floor(slot.shopItem.price * 0.5)}`,
      value: slot.shopItem.id
    }));

    // 4. Build Embed
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
      .addFields({
        name: "💰 Total Asset Value",
        value: fmtCurrency(netWorth, emoji),
        inline: false
      })
      .setFooter({ text: "Select an item below to Sell, Trade, or List." })
      .setTimestamp();

    // 5. Components
    const rows = [];

    // Only show menu if it's the user's OWN inventory (can't manage others)
    if (targetUser.id === message.author.id) {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("inv_select_item")
        .setPlaceholder("Select an item to manage...")
        .addOptions(options);

      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu));
    }

    return message.reply({ embeds: [embed], components: rows });

  } catch (err) {
    console.error("Inventory Error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Error", "Failed to fetch inventory.")] });
  }
}