// src/commands/general/help.ts
import {
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
  StringSelectMenuInteraction,
  Colors,
} from "discord.js";

import { getEmojiRecord, preferEmojiInlineOrUrl, emojiIconUrl } from "../../utils/emojiRegistry";

/**
 * Interactive help menu:
 * - Thumbnail uses bot avatar
 * - Title: coin emoji inline before "Casino" when available (falls back to 🪙)
 * - Dropdown options use registry keys:
 *    general, casino_cash, income, cards, admin
 * - Dropdown replies are ephemeral (only visible to the invoker)
 */
export async function handleHelp(message: Message) {
  const isAdmin = message.member?.permissions.has("Administrator") ?? false;

  // coin inline if available in this guild otherwise fallback unicode
  const coinPick = preferEmojiInlineOrUrl("coin", message.guild ?? null);
  const coinInlinePrefix = coinPick?.type === "inline" ? `${coinPick.value} ` : "🪙 ";

  // thumbnail: bot avatar (as requested)
  const thumbnailUrl = message.client.user?.displayAvatarURL({ size: 256, extension: "png" });

  const overview = new EmbedBuilder()
    .setTitle(`${coinInlinePrefix}Casino Bot — Help Menu`)
    .setDescription(
      "Use the dropdown below to explore command categories.\n\n🔒 Admin section requires server Admin permissions.\n\nResults will be shown only to you (ephemeral)."
    )
    .setColor(Colors.DarkPurple)
    .setThumbnail(thumbnailUrl)
    .setFooter({ text: "Menu expires in 60s • Only you can use the dropdown" })
    .setTimestamp();

  // helper to produce select option with registry emoji or unicode fallback
  function optionWithEmoji(label: string, value: string, desc: string, registryKey?: string, fallbackUnicode?: string) {
    const opt = new StringSelectMenuOptionBuilder().setLabel(label).setValue(value).setDescription(desc);
    if (registryKey) {
      const rec = getEmojiRecord(registryKey);
      if (rec && rec.id) {
        opt.setEmoji({ id: rec.id, name: rec.name ?? registryKey, animated: !!rec.animated });
        return opt;
      }
    }
    if (fallbackUnicode) opt.setEmoji({ name: fallbackUnicode });
    return opt;
  }

  // Build options using requested keys and fallbacks
  const options = [
    optionWithEmoji("General", "general", "Basic commands & info", "general", "ℹ️"),
    optionWithEmoji("Economy", "economy", "Wallet, bank, deposit, withdraw", "casino_cash", "💵"),
    optionWithEmoji("Income", "income", "Work / Beg / Crime / Slut commands", "income", "🪙"),
    optionWithEmoji("Games", "games", "Roulette & other casino games", "cards", "🎴"),
    optionWithEmoji("Admin", "admin", "Admin-only configuration commands", "admin", "🛠️"),
  ];

  const select = new StringSelectMenuBuilder()
    .setCustomId("help_select")
    .setPlaceholder("Select a help category")
    .addOptions(options)
    .setMinValues(1)
    .setMaxValues(1);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  // first message (must be public, ephemeral not allowed here)
  const sent = await message.reply({ embeds: [overview], components: [row] });

  // collector for only the invoking user
  const collector = sent.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60_000,
    filter: (i: StringSelectMenuInteraction) => i.user.id === message.author.id,
  });

  collector.on("collect", async (interaction: StringSelectMenuInteraction) => {
    try {
      const value = interaction.values[0];

      let embed: EmbedBuilder = new EmbedBuilder()
        .setTitle("Unknown Section")
        .setDescription("Something went wrong. Please try again.")
        .setColor(Colors.Red);

      if (value === "general") {
        embed = new EmbedBuilder()
          .setTitle("📘 General Commands")
          .setColor(Colors.Blurple)
          .addFields(
            { name: "`!help`", value: "Show this interactive help menu.", inline: true },
            { name: "`!getid`", value: "Show guild ID, your ID and bot client ID.", inline: true },
            { name: "`!bal` / `!balance`", value: "Show wallet & bank balances.", inline: true }
          )
          .setTimestamp();
      } else if (value === "economy") {
        embed = new EmbedBuilder()
          .setTitle("💰 Economy Commands")
          .setColor(Colors.Gold)
          .addFields(
            { name: "`!dep <amount|all>`", value: "Deposit money from your wallet into the bank.", inline: false },
            { name: "`!with <amount|all>`", value: "Withdraw money from bank to wallet.", inline: false },
            { name: "`!transfer <amount> @user`", value: "Transfer (gift) money to another user.", inline: false },
            { name: "`Aliases`", value: "`!dep` = deposit, `!with` = withdraw, `!bal` = balance", inline: false }
          )
          .setTimestamp();
      } else if (value === "income") {
        embed = new EmbedBuilder()
          .setTitle("🪙 Income Commands")
          .setColor(Colors.Green)
          .addFields(
            { name: "`!work`", value: "Standard income. Admin-configurable range & cooldown.", inline: false },
            { name: "`!beg`", value: "Low reward income. Configurable.", inline: false },
            { name: "`!crime`", value: "High risk / high reward. Has success% & penalty% (configurable).", inline: false },
            { name: "`!slut`", value: "Similar to crime — configurable success & penalty.", inline: false },
            { name: "How it works", value: "On success you receive a random amount between min and max. On fail a penalty (percentage) is deducted.", inline: false }
          )
          .setTimestamp();
      } else if (value === "games") {
        embed = new EmbedBuilder()
          .setTitle("🎲 Games")
          .setColor(Colors.Orange)
          .addFields(
            { name: "`!bet <amount> <choice>`", value: "Roulette betting. Use amount and your choice (color/number).", inline: false },
            { name: "Other games", value: "Slots, blackjack, coinflip can be added on request.", inline: false }
          )
          .setTimestamp();
      } else if (value === "admin") {
        const isInvokerAdmin = interaction.memberPermissions?.has("Administrator") ?? false;
        if (!isInvokerAdmin) {
          embed = new EmbedBuilder()
            .setTitle("🔒 Admin Section")
            .setDescription("You must be a server Administrator to view admin commands.")
            .setColor(Colors.DarkRed)
            .setTimestamp();
        } else {
          embed = new EmbedBuilder()
            .setTitle("🛠 Admin Commands")
            .setColor(Colors.Red)
            .addFields(
              { name: "`!addmoney @user <amount>`", value: "Add money to a user's wallet.", inline: false },
              { name: "`!setstartmoney <amount>`", value: "Set starting money for new users.", inline: false },
              { name: "`!setincomecooldown <cmd> <seconds>`", value: "Set cooldown for income commands.", inline: false },
              { name: "`!setincome <cmd> <field> <value>`", value: "Configure min/max/cooldown/success/penalty for income commands.", inline: false },
              { name: "`!setprefix <symbol>`", value: "Change the server prefix.", inline: false },
              { name: "`!adminviewconfig`", value: "View guild economy config.", inline: false },
              { name: "`!reseteconomy confirm`", value: "⚠ Wipes transactions and zeroes wallets/banks (global).", inline: false }
            )
            .setTimestamp();
        }
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error("Help collector error (collect):", err);
      try {
        await interaction.reply({ content: "An error occurred while fetching help. Please try again.", ephemeral: true });
      } catch {}
    }
  });

  collector.on("end", async () => {
    try {
      const disabledMenu = StringSelectMenuBuilder.from(select).setDisabled(true);
      const disabledRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(disabledMenu);
      await sent.edit({ components: [disabledRow] });
    } catch (err) {
      // ignore
    }
  });

  return;
}
