import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
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

// Layout: 1 Row per Item (to align Name and Price side-by-side)
// Row content: [ Name Button (Gray) ] [ Price Button (Green) ]
// Max 5 rows allowed. 1 reserved for Nav.
// Result: 4 Items per page.
const ITEMS_PER_PAGE = 4;

// Helper to generate the store UI
function renderStorePage(items: any[], page: number, emoji: string) {
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  page = Math.max(1, Math.min(page, totalPages));

  const start = (page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const currentItems = items.slice(start, end);

  // 1. EMBED (Header Only - Matches UnbelievaBoat)
  const embed = new EmbedBuilder()
    .setTitle("Store")
    .setDescription("Click a button below to instantly buy an item, or use the `/shop buy` command.\nFor more details before purchasing, use the `/shop info` command.")
    .setColor(Colors.DarkGrey)
    .setFooter({ text: `Page ${page}/${totalPages}` });

  // 2. COMPONENT ROWS (The List Layout)
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (const item of currentItems) {
    // Left Button: Info / Name (Gray)
    const infoBtn = new ButtonBuilder()
      .setCustomId(`shop_info_${item.id}`)
      .setLabel(item.name.length > 25 ? item.name.substring(0, 22) + "..." : item.name)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("❔");

    // Right Button: Price / Buy (Green)
    const buyBtn = new ButtonBuilder()
      .setCustomId(`shop_buy_${item.id}`)
      .setLabel(item.price.toLocaleString()) // Just the number on the button
      .setStyle(ButtonStyle.Success);

    // Try to set emoji on buy button
    try {
      // Regex to detect custom emoji ID or fallback to standard
      const btnEmoji = emoji.match(/:(\d+)>/)?.[1] ?? (emoji.match(/^\d+$/) ? emoji : "🛒");
      buyBtn.setEmoji(btnEmoji);
    } catch {
      buyBtn.setEmoji("🛒");
    }

    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(infoBtn, buyBtn));
  }

  // 3. NAVIGATION ROW
  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`shop_prev`).setLabel("Previous Page").setStyle(ButtonStyle.Primary).setDisabled(page <= 1),
    new ButtonBuilder().setCustomId(`shop_next`).setLabel("Next Page").setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages)
  );
  rows.push(navRow);

  return { embed, components: rows, page, totalPages };
}

export const data = new SlashCommandBuilder()
  .setName("shop")
  .setDescription("Access the server shop")
  .addSubcommand((sub) =>
    sub
      .setName("view")
      .setDescription("View the shop items and buy via buttons")
  )
  .addSubcommand((sub) =>
    sub
      .setName("buy")
      .setDescription("Buy a specific item by name")
      .addStringOption((opt) => opt.setName("item").setDescription("Name of the item").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("inventory")
      .setDescription("View your current inventory")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const config = await getGuildConfig(interaction.guildId!);
  const emoji = config.currencyEmoji;
  const subcommand = interaction.options.getSubcommand();

  // --- SUBCOMMAND: /shop buy <item> ---
  if (subcommand === "buy") {
    const itemName = interaction.options.getString("item", true);
    await interaction.deferReply(); // Acknowledge to prevent timeout

    try {
      await ensureUserAndWallet(interaction.user.id, interaction.user.tag);
      const item = await buyItem(interaction.guildId!, interaction.user.id, itemName);
      if (item.roleId && interaction.guild) {
        const role = interaction.guild.roles.cache.get(item.roleId);
        if (role) {
            const member = interaction.member as GuildMember;
            try { await member.roles.add(role); } catch {}
        }
      }
      return interaction.editReply({ embeds: [successEmbed(interaction.user, "Purchase Successful", `You bought **${item.name}**!`)] });
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed(interaction.user, "Failed", (err as Error).message)] });
    }
  }

  // --- SUBCOMMAND: /shop inventory ---
  if (subcommand === "inventory") {
    await interaction.deferReply();
    const inv = await getUserInventory(interaction.user.id, interaction.guildId!);
    if (inv.length === 0) return interaction.editReply("Your inventory is empty.");
    const desc = inv.map(i => `• **${i.shopItem.name}** (x${i.amount})`).join("\n");
    const embed = new EmbedBuilder().setTitle(`${interaction.user.username}'s Inventory`).setColor(Colors.Blue).setDescription(desc || "Empty");
    return interaction.editReply({ embeds: [embed] });
  }

  // --- MAIN SHOP DASHBOARD (/shop view) ---
  if (subcommand === "view") {
    try {
      await interaction.deferReply(); // Loading state
      const allItems = await getShopItems(interaction.guildId!);
      if (allItems.length === 0) {
        return interaction.editReply({ embeds: [errorEmbed(interaction.user, "Shop Empty", "No items are currently for sale.")] });
      }

      let currentPage = 1;
      const ui = renderStorePage(allItems, currentPage, emoji);
      const sentMessage = await interaction.editReply({ embeds: [ui.embed], components: ui.components });

      const collector = sentMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120_000,
        filter: (i) => i.user.id === interaction.user.id
      });

      collector.on("collect", async (btnInteraction: ButtonInteraction) => {
        // Navigation
        if (btnInteraction.customId === "shop_prev") {
          currentPage--;
          const newUI = renderStorePage(allItems, currentPage, emoji);
          await btnInteraction.update({ embeds: [newUI.embed], components: newUI.components });
          return;
        }
        if (btnInteraction.customId === "shop_next") {
          currentPage++;
          const newUI = renderStorePage(allItems, currentPage, emoji);
          await btnInteraction.update({ embeds: [newUI.embed], components: newUI.components });
          return;
        }

        // Info Button
        if (btnInteraction.customId.startsWith("shop_info_")) {
          const itemId = btnInteraction.customId.replace("shop_info_", "");
          const item = allItems.find(i => i.id === itemId);
          if (item) {
            const detailEmbed = new EmbedBuilder()
              .setTitle(item.name)
              .setDescription(item.description)
              .setColor(Colors.Blurple)
              .addFields(
                { name: "Price", value: fmtCurrency(item.price, emoji), inline: true },
                { name: "Stock", value: item.stock === -1 ? "∞" : item.stock.toString(), inline: true }
              );
            
            await btnInteraction.reply({ embeds: [detailEmbed], ephemeral: true });
          } else {
            await btnInteraction.reply({ content: "Item not found.", ephemeral: true });
          }
          return;
        }

        // Buy Button
        if (btnInteraction.customId.startsWith("shop_buy_")) {
          const itemId = btnInteraction.customId.replace("shop_buy_", "");
          const item = allItems.find(i => i.id === itemId);

          if (!item) {
            await btnInteraction.reply({ content: "Item no longer exists.", ephemeral: true });
            return;
          }

          try {
            await ensureUserAndWallet(btnInteraction.user.id, btnInteraction.user.tag);
            const bought = await buyItem(btnInteraction.guildId!, btnInteraction.user.id, item.name);
            
            if (bought.roleId && btnInteraction.guild) {
              const role = btnInteraction.guild.roles.cache.get(bought.roleId);
              if (role) {
                 const member = btnInteraction.member as GuildMember;
                 try { await member.roles.add(role); } catch(e) { console.log("Role error", e); }
              }
            }

            await btnInteraction.reply({ 
              content: `✅ Successfully purchased **${bought.name}** for **${fmtCurrency(bought.price, emoji)}**.`, 
              ephemeral: true 
            });
          } catch (err) {
            await btnInteraction.reply({ content: `❌ Purchase failed: ${(err as Error).message}`, ephemeral: true });
          }
        }
      });

      collector.on("end", () => {
        try {
          // FIX: Regenerate the UI using our helper instead of parsing the message
          const endUI = renderStorePage(allItems, currentPage, emoji);
          
          // Disable all buttons
          const disabledRows = endUI.components.map(row => {
            row.components.forEach(btn => btn.setDisabled(true));
            return row;
          });

          sentMessage.edit({ components: disabledRows }).catch(() => {});
        } catch {}
      });

    } catch (err) {
      console.error("slashShop error:", err);
      if (interaction.replied || interaction.deferred) {
          await interaction.followUp("Failed to load shop.");
      } else {
          await interaction.reply("Failed to load shop.");
      }
    }
  }
}