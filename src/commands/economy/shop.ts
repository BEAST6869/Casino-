import {
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  ComponentType,
  ButtonInteraction,
  GuildMember,
  APIButtonComponent
} from "discord.js";
import { getShopItems, buyItem, getUserInventory } from "../../services/shopService";
import { getGuildConfig } from "../../services/guildConfigService";
import { ensureUserAndWallet } from "../../services/walletService";
import { fmtCurrency } from "../../utils/format";
import { successEmbed, errorEmbed } from "../../utils/embed";

// Layout: Items listed in Embed Text.
// Interaction: Numbered buttons (1-5) below to buy.
const ITEMS_PER_PAGE = 5;

// Helper: Render the Shop Page
function renderShopPage(items: any[], page: number, totalPages: number, currencyEmoji: string) {
  const start = (page - 1) * ITEMS_PER_PAGE;
  const currentItems = items.slice(start, start + ITEMS_PER_PAGE);

  // 1. EMBED: List items with numbers
  const embed = new EmbedBuilder()
    .setTitle("Store")
    .setColor(Colors.DarkGrey)
    .setFooter({ text: `Page ${page}/${totalPages} • Click the numbered button to buy` });

  if (currentItems.length > 0) {
    const description = currentItems.map((item, index) => {
      // "1. ItemName — Price"
      return `**${index + 1}. ${item.name}** — ${fmtCurrency(item.price, currencyEmoji)}\n*${item.description || "No description"}*`;
    }).join("\n\n");
    embed.setDescription(description);
  } else {
    embed.setDescription("No items available.");
  }

  // 2. BUY BUTTONS (Row 1)
  const buyRow = new ActionRowBuilder<ButtonBuilder>();
  currentItems.forEach((item, index) => {
    buyRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_buy_${item.id}`)
        .setLabel(`${index + 1}`) // 1, 2, 3, 4, 5
        .setStyle(ButtonStyle.Success) // Green
        .setEmoji("🛒")
    );
  });

  // 3. NAVIGATION (Row 2)
  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("shop_prev").setLabel("Previous").setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
    new ButtonBuilder().setCustomId("shop_next").setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages)
  );

  // Return components (Buy row only if items exist)
  const components = currentItems.length > 0 ? [buyRow, navRow] : [navRow];

  return { embed, components };
}

// --- Main Command Handler ---
export async function handleShop(message: Message, args: string[]) {
  try {
    const config = await getGuildConfig(message.guildId!);
    const emoji = config.currencyEmoji;
    const sub = args[0]?.toLowerCase();

    // Subcommand: !shop buy <item>
    if (sub === "buy") {
      const itemName = args.slice(1).join(" ");
      if (!itemName) return message.reply("Usage: `!shop buy <item name>`");
      
      try {
        await ensureUserAndWallet(message.author.id, message.author.tag);
        const item = await buyItem(message.guildId!, message.author.id, itemName);
        
        if (item.roleId && message.guild) {
            const role = message.guild.roles.cache.get(item.roleId);
            if (role) try { await message.member?.roles.add(role); } catch {}
        }

        return message.reply({ embeds: [successEmbed(message.author, "Purchase Successful", `You bought **${item.name}**!`)] });
      } catch (err) {
        return message.reply({ embeds: [errorEmbed(message.author, "Failed", (err as Error).message)] });
      }
    }

    // Subcommand: !shop inv
    if (sub === "inv" || sub === "inventory") {
      const inv = await getUserInventory(message.author.id, message.guildId!);
      if (inv.length === 0) return message.reply("Your inventory is empty.");
      const desc = inv.map(i => `• **${i.shopItem.name}** (x${i.amount})`).join("\n");
      const embed = new EmbedBuilder().setTitle(`${message.author.username}'s Inventory`).setColor(Colors.Blue).setDescription(desc || "Empty");
      return message.reply({ embeds: [embed] });
    }

    // Main Dashboard
    const allItems = await getShopItems(message.guildId!);
    if (allItems.length === 0) {
      return message.reply({ embeds: [errorEmbed(message.author, "Shop Empty", "No items are currently for sale.")] });
    }

    let currentPage = 1;
    const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);

    const ui = renderShopPage(allItems, currentPage, totalPages, emoji);
    const sentMessage = await message.reply({ embeds: [ui.embed], components: ui.components });

    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
      filter: (i) => i.user.id === message.author.id
    });

    collector.on("collect", async (interaction) => {
      // Navigation
      if (interaction.customId === "shop_prev") {
        currentPage--;
        const newUI = renderShopPage(allItems, currentPage, totalPages, emoji);
        await interaction.update({ embeds: [newUI.embed], components: newUI.components });
        return;
      }
      if (interaction.customId === "shop_next") {
        currentPage++;
        const newUI = renderShopPage(allItems, currentPage, totalPages, emoji);
        await interaction.update({ embeds: [newUI.embed], components: newUI.components });
        return;
      }

      // Buy Button
      if (interaction.customId.startsWith("shop_buy_")) {
        const itemId = interaction.customId.replace("shop_buy_", "");
        const item = allItems.find(i => i.id === itemId);

        if (!item) {
          await interaction.reply({ content: "Item not found.", ephemeral: true });
          return;
        }

        try {
          await ensureUserAndWallet(interaction.user.id, interaction.user.tag);
          const bought = await buyItem(interaction.guildId!, interaction.user.id, item.name);
          
          if (bought.roleId && interaction.guild) {
            const role = interaction.guild.roles.cache.get(bought.roleId);
            if (role) {
                const member = interaction.member as GuildMember;
                try { await member.roles.add(role); } catch(e) {}
            }
          }

          await interaction.reply({ 
            content: `✅ Purchased **${bought.name}** for **${fmtCurrency(bought.price, emoji)}**!`, 
            ephemeral: true 
          });
        } catch (err) {
          await interaction.reply({ content: `❌ Error: ${(err as Error).message}`, ephemeral: true });
        }
      }
    });

    collector.on("end", () => {
      try {
        // Safe reconstruction to disable buttons
        const finalUI = renderShopPage(allItems, currentPage, totalPages, emoji);
        
        finalUI.components.forEach(row => {
            row.components.forEach(btn => btn.setDisabled(true));
        });

        sentMessage.edit({ components: finalUI.components }).catch(() => {});
      } catch {}
    });

  } catch (err) {
    console.error("handleShop error:", err);
    try { await message.reply("Failed to load shop."); } catch {}
  }
}