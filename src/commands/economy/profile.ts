import { 
  Message, 
  EmbedBuilder, 
  Colors, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType, 
  ButtonInteraction
} from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { getBankByUserId } from "../../services/bankService";
import { getUserInventory } from "../../services/shopService";
import { getGuildConfig } from "../../services/guildConfigService";
import { fmtCurrency } from "../../utils/format";
import { errorEmbed } from "../../utils/embed";
import { getEmojiRecord, emojiInline } from "../../utils/emojiRegistry";

export async function handleProfile(message: Message, args: string[]) {
  try {
    const targetUser = message.mentions.users.first() || message.author;
    if (targetUser.bot) return message.reply({ embeds: [errorEmbed(message.author, "Error", "Bots do not have profiles.")] });

    // 1. Fetch User First (We need the internal database ID for Bank lookup)
    const user = await ensureUserAndWallet(targetUser.id, targetUser.tag);

    // 2. Now fetch dependent data using the correct IDs
    const [inventory, bank, config] = await Promise.all([
      getUserInventory(targetUser.id, message.guildId!), 
      getBankByUserId(user.id), 
      getGuildConfig(message.guildId!)
    ]);

    const currencyEmoji = config.currencyEmoji;
    const walletBal = user.wallet?.balance ?? 0;
    const bankBal = bank?.balance ?? 0;

    // 3. Calculate Inventory Value
    const inventoryValue = inventory.reduce((sum, slot) => {
      return sum + (slot.shopItem.price * slot.amount);
    }, 0);

    // 4. Calculate Net Worth
    const netWorth = walletBal + bankBal + inventoryValue;

    // 5. Resolve Custom Emojis from Guild (fallback to defaults if missing)
    const eWallet = emojiInline("Wallet", message.guild) || "👛"; 
    const eBank = emojiInline("bank", message.guild) || "🏦";
    const eInv = emojiInline("inventory", message.guild) || "🎒";
    const eGraph = emojiInline("graph", message.guild) || "📈";
    const eCredits = emojiInline("credits", message.guild) || "🏆";

    // 6. Build Profile Embed
    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Profile`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .setColor(Colors.Gold)
      .addFields(
        { name: `${eWallet} Wallet`, value: fmtCurrency(walletBal, currencyEmoji), inline: true },
        { name: `${eBank} Bank`, value: fmtCurrency(bankBal, currencyEmoji), inline: true },
        { name: `${eInv} Inventory Value`, value: fmtCurrency(inventoryValue, currencyEmoji), inline: true },
        { name: `${eGraph} Net Worth`, value: fmtCurrency(netWorth, currencyEmoji), inline: true },
        { name: `${eCredits} Credit Score`, value: `${user.creditScore}`, inline: true }
      )
      .setFooter({ text: "Global Economy Stats" })
      .setTimestamp();

    // 7. Create Buttons
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("prof_inv").setLabel("Inventory").setStyle(ButtonStyle.Secondary).setEmoji(eInv.match(/^\d+$/) ? eInv : "🎒"), 
      new ButtonBuilder().setCustomId("prof_bal").setLabel("Balance").setStyle(ButtonStyle.Secondary).setEmoji(eWallet.match(/^\d+$/) ? eWallet : "👛") // Changed button emoji default
    );

    // Try to set button emoji from registry ID if available for cleaner look
    const recInv = getEmojiRecord("inventory");
    const recWallet = getEmojiRecord("Wallet");
    
    if (recInv?.id) row.components[0].setEmoji(recInv.id);
    if (recWallet?.id) row.components[1].setEmoji(recWallet.id);


    const sentMsg = await message.reply({ embeds: [embed], components: [row] });

    // 8. Interaction Collector
    const collector = sentMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
      filter: (i) => i.user.id === message.author.id
    });

    collector.on("collect", async (interaction: ButtonInteraction) => {
      if (interaction.customId === "prof_inv") {
        if (inventory.length === 0) {
          await interaction.reply({ content: "Inventory is empty.", ephemeral: true });
        } else {
          const itemsList = inventory.slice(0, 10).map(i => `• ${i.shopItem.name} (x${i.amount})`).join("\n");
          const invEmbed = new EmbedBuilder()
            .setTitle(`${eInv} Quick Inventory`)
            .setColor(Colors.Blue)
            .setDescription(itemsList + (inventory.length > 10 ? `\n...and ${inventory.length - 10} more` : ""));
          await interaction.reply({ embeds: [invEmbed], ephemeral: true });
        }
      }

      if (interaction.customId === "prof_bal") {
        const balEmbed = new EmbedBuilder()
          .setTitle(`${eGraph} Balance Details`)
          .setColor(Colors.Green)
          .addFields(
            { name: "Wallet", value: fmtCurrency(walletBal, currencyEmoji), inline: true },
            { name: "Bank", value: fmtCurrency(bankBal, currencyEmoji), inline: true },
            { name: "Net Worth", value: fmtCurrency(netWorth, currencyEmoji), inline: true }
          )
          .setFooter({ text: "Private View" });

        await interaction.reply({ embeds: [balEmbed], ephemeral: true });
      }
    });

    collector.on("end", () => {
      try {
        const disabledRow = ActionRowBuilder.from(row).setComponents(
          row.components.map(c => ButtonBuilder.from(c).setDisabled(true))
        );
        sentMsg.edit({ components: [disabledRow as ActionRowBuilder<ButtonBuilder>] }).catch(() => {});
      } catch {}
    });

  } catch (err) {
    console.error("Profile Error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Error", "Failed to load profile.")] });
  }
}