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

/**
 * Interactive help menu (message-based) with ephemeral dropdown responses.
 * - First message is public (Discord limitation), dropdown results are ephemeral.
 * - Only the invoking user can use the dropdown.
 */
export async function handleHelp(message: Message) {
  const isAdmin = message.member?.permissions.has("Administrator") ?? false;

  // --- Overview (public) ---
  const overview = new EmbedBuilder()
    .setTitle("🎰 Casino Bot — Help Menu")
    .setDescription(
      "Use the dropdown below to explore command categories.\n\n🔒 Admin section requires server Admin permissions.\n\nResults will be shown only to you (ephemeral)."
    )
    .setColor(Colors.DarkPurple)
    .setThumbnail(message.client.user?.displayAvatarURL({ size: 256 }) ?? undefined)
    .setFooter({ text: "Menu expires in 60s • Only you can use the dropdown" })
    .setTimestamp();

  // --- build select menu options ---
  const options = [
    new StringSelectMenuOptionBuilder()
      .setLabel("General")
      .setValue("general")
      .setDescription("Basic commands & info"),
    new StringSelectMenuOptionBuilder()
      .setLabel("Economy")
      .setValue("economy")
      .setDescription("Wallet, bank, deposit, withdraw"),
    new StringSelectMenuOptionBuilder()
      .setLabel("Income")
      .setValue("income")
      .setDescription("Work / Beg / Crime / Slut commands"),
    new StringSelectMenuOptionBuilder()
      .setLabel("Games")
      .setValue("games")
      .setDescription("Roulette & other casino games"),
    new StringSelectMenuOptionBuilder()
      .setLabel("Admin")
      .setValue("admin")
      .setDescription("Admin-only configuration commands"),
  ];

  const select = new StringSelectMenuBuilder()
    .setCustomId("help_select")
    .setPlaceholder("Select a help category")
    .addOptions(options)
    .setMinValues(1)
    .setMaxValues(1);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  // send initial public message (note: first message can't be ephemeral for message-based commands)
  const sent = await message.reply({ embeds: [overview], components: [row] });

  // create a collector that only allows the command invoker to use the menu
  const collector = sent.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60_000,
    filter: (i: StringSelectMenuInteraction) => i.user.id === message.author.id,
  });

  collector.on("collect", async (interaction: StringSelectMenuInteraction) => {
    try {
      // selection value
      const value = interaction.values[0];

      // default initialized embed to satisfy TS and in case something goes wrong
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
            { name: "More games", value: "Slots, blackjack, coinflip can be added on request.", inline: false }
          )
          .setTimestamp();
      } else if (value === "admin") {
        // For admin section, check interaction member perms (this is ephemeral and only visible to the user)
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
              { name: "`!setprefix <symbol>`", value: "Change server prefix.", inline: false },
              { name: "`!adminviewconfig`", value: "View guild economy config.", inline: false },
              { name: "`!reseteconomy confirm`", value: "⚠ Wipes transactions and zeroes wallets/banks (global).", inline: false }
            )
            .setTimestamp();
        }
      }

      // Reply ephemerally with the selected section embed
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
      // disable the select menu on the original message so it's not usable after timeout
      const disabledMenu = StringSelectMenuBuilder.from(select).setDisabled(true);
      const disabledRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(disabledMenu);
      await sent.edit({ components: [disabledRow] });
    } catch (err) {
      // non-critical: ignore edit failures
    }
  });

  return;
}
