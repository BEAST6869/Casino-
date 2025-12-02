import { 
  Message, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder, 
  ComponentType, 
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Colors,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  CacheType
} from "discord.js";
import { getShopItems, getShopItemByName, updateShopItem, deleteShopItem } from "../../services/shopService";
import { getGuildConfig } from "../../services/guildConfigService";
import { fmtCurrency } from "../../utils/format";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleManageShop(message: Message, args: string[]) {
  // 1. Permission Check
  if (!message.member?.permissions.has("Administrator")) {
    return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "Admins only.")] });
  }

  const config = await getGuildConfig(message.guildId!);
  const emoji = config.currencyEmoji;
  const searchName = args.join(" ");

  let targetItem: any;

  // 2. Resolve Target Item (Search or Select)
  if (searchName) {
    // Direct lookup: !manageitem Sword
    targetItem = await getShopItemByName(message.guildId!, searchName);
    if (!targetItem) return message.reply("Item not found.");
  } else {
    // Dropdown lookup: !manageitem
    const items = await getShopItems(message.guildId!);
    if (items.length === 0) return message.reply("Shop is empty.");

    const select = new StringSelectMenuBuilder()
      .setCustomId("manage_select_item")
      .setPlaceholder("Select an item to manage...")
      .addOptions(items.slice(0, 25).map(i => 
        new StringSelectMenuOptionBuilder()
          .setLabel(i.name)
          .setValue(i.id)
          .setDescription(`${i.price} coins`)
      ));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    const msg = await message.reply({ content: "Select an item to edit or delete:", components: [row] });

    try {
      const selection = await msg.awaitMessageComponent({ 
        componentType: ComponentType.StringSelect, 
        time: 60000, 
        filter: (i: StringSelectMenuInteraction<CacheType>) => i.user.id === message.author.id 
      });
      targetItem = items.find(i => i.id === selection.values[0]);
      await selection.deferUpdate(); // Acknowledge selection
    } catch {
      return msg.edit({ content: "Timed out.", components: [] });
    }
  }

  if (!targetItem) return message.reply("Error finding item.");

  // 3. Render the Control Panel
  const renderPanel = (item: any) => {
    const embed = new EmbedBuilder()
      .setTitle(`⚙️ Managing: ${item.name}`)
      .setColor(Colors.Orange)
      .addFields(
        { name: "Name", value: item.name, inline: true },
        { name: "Price", value: fmtCurrency(item.price, emoji), inline: true },
        { name: "Stock", value: item.stock === -1 ? "Infinite" : String(item.stock), inline: true },
        { name: "Description", value: item.description || "None", inline: false },
        { name: "Role ID", value: item.roleId || "None", inline: false }
      );

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("edit_name").setLabel("Name").setStyle(ButtonStyle.Secondary).setEmoji("📝"),
      new ButtonBuilder().setCustomId("edit_price").setLabel("Price").setStyle(ButtonStyle.Secondary).setEmoji("💰"),
      new ButtonBuilder().setCustomId("edit_stock").setLabel("Stock").setStyle(ButtonStyle.Secondary).setEmoji("📦"),
      new ButtonBuilder().setCustomId("edit_desc").setLabel("Desc").setStyle(ButtonStyle.Secondary).setEmoji("📜")
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("btn_delete").setLabel("DELETE ITEM").setStyle(ButtonStyle.Danger).setEmoji("🗑️"),
      new ButtonBuilder().setCustomId("btn_done").setLabel("Done").setStyle(ButtonStyle.Success)
    );

    return { embeds: [embed], components: [row1, row2] };
  };

  // 4. Send Panel & Start Collector
  const ui = renderPanel(targetItem);
  const panelMsg = await message.reply(ui);

  const collector = panelMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 300_000, // 5 mins
    filter: (i: ButtonInteraction<CacheType>) => i.user.id === message.author.id
  });

  collector.on("collect", async (interaction: ButtonInteraction<CacheType>) => {
    if (!targetItem) return;

    // --- DELETE Action ---
    if (interaction.customId === "btn_delete") {
      await deleteShopItem(targetItem.id);
      await interaction.update({ content: `🗑️ **${targetItem.name}** has been deleted.`, embeds: [], components: [] });
      collector.stop();
      return;
    }

    // --- DONE Action ---
    if (interaction.customId === "btn_done") {
      await interaction.update({ components: [] });
      collector.stop();
      return;
    }

    // --- EDIT Actions (Open Modal) ---
    let modalId = "";
    let label = "";
    let fieldId = "";
    let style = TextInputStyle.Short;
    let currentVal = "";

    switch (interaction.customId) {
      case "edit_name": modalId = "modal_name"; label = "New Name"; fieldId = "val_name"; currentVal = targetItem.name; break;
      case "edit_price": modalId = "modal_price"; label = "New Price"; fieldId = "val_price"; currentVal = String(targetItem.price); break;
      case "edit_stock": modalId = "modal_stock"; label = "New Stock (-1 for inf)"; fieldId = "val_stock"; currentVal = String(targetItem.stock); break;
      case "edit_desc": modalId = "modal_desc"; label = "Description"; fieldId = "val_desc"; currentVal = targetItem.description; style = TextInputStyle.Paragraph; break;
    }

    if (modalId) {
      const modal = new ModalBuilder().setCustomId(modalId).setTitle(`Edit ${targetItem.name}`);
      const input = new TextInputBuilder().setCustomId(fieldId).setLabel(label).setStyle(style).setValue(currentVal).setRequired(true);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

      await interaction.showModal(modal);

      try {
        // Wait for Modal Submit
        const submission = await interaction.awaitModalSubmit({ 
          time: 60000, 
          filter: (i: ModalSubmitInteraction<CacheType>) => i.user.id === message.author.id 
        });
        const newValue = submission.fields.getTextInputValue(fieldId);
        
        const updates: any = {};
        
        // Validate Inputs
        if (modalId === "modal_name") updates.name = newValue;
        if (modalId === "modal_desc") updates.description = newValue;
        if (modalId === "modal_price") {
          const p = parseInt(newValue);
          if (isNaN(p) || p < 0) { await submission.reply({ content: "Invalid price", ephemeral: true }); return; }
          updates.price = p;
        }
        if (modalId === "modal_stock") {
          const s = parseInt(newValue);
          if (isNaN(s)) { await submission.reply({ content: "Invalid stock", ephemeral: true }); return; }
          updates.stock = s;
        }

        // Update Database
        targetItem = await updateShopItem(message.guildId!, targetItem.id, updates);
        
        // Refresh Panel (Using edit instead of update to be safe)
        await submission.deferUpdate();
        await panelMsg.edit(renderPanel(targetItem));

      } catch (e) {
        // Modal timed out or cancelled
      }
    }
  });

  collector.on("end", () => {
    if (panelMsg.editable) panelMsg.edit({ components: [] }).catch(() => {});
  });
}