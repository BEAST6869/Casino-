import {
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
  StringSelectMenuInteraction,
  Colors,
  PermissionsBitField,
  GuildMember
} from "discord.js";
import { getGuildConfig } from "../../services/guildConfigService";
import { emojiInline } from "../../utils/emojiRegistry";

export async function handleHelp(message: Message) {
  const config = await getGuildConfig(message.guildId!);
  const prefix = config.prefix;

  // 1. Resolve Emojis (Custom or Default)
  // UPDATED: Using the specific ID provided by the user
  const eEconomy = "<a:money:1445732360204193824>"; 
  const eGames   = emojiInline("casino", message.guild) || "🎰";
  const eAdmin   = emojiInline("settings", message.guild) || "⚙️";
  const eIncome  = config.currencyEmoji;

  // 2. Helper to prepare Emoji for Select Menu (Returns string for unicode, object for custom)
  const resolveMenuEmoji = (str: string) => {
    // Check if it's a custom emoji format <a:name:id> or <:name:id>
    const match = str.match(/:(\d+)>/);
    if (match) {
      return { id: match[1] }; // Return Object for Custom Emoji
    }
    // Check if it's already just an ID
    if (str.match(/^\d+$/)) {
      return { id: str };
    }
    // Otherwise assume it's unicode
    return str;
  };

  const overview = new EmbedBuilder()
    .setTitle(`${eIncome} Casino Bot — Help Menu`)
    .setDescription(`Use the dropdown below to explore commands.\nServer Prefix: \`${prefix}\``)
    .setColor(Colors.DarkPurple)
    .setThumbnail(message.client.user?.displayAvatarURL() ?? null);

  const options = [
    new StringSelectMenuOptionBuilder()
      .setLabel("Economy")
      .setValue("economy")
      .setDescription("Money, Banking, Shop, Leaderboard")
      .setEmoji(resolveMenuEmoji(eEconomy) as any), 

    new StringSelectMenuOptionBuilder()
      .setLabel("Income")
      .setValue("income")
      .setDescription("Work, Beg, Crime")
      .setEmoji(resolveMenuEmoji(eIncome) as any), 

    new StringSelectMenuOptionBuilder()
      .setLabel("Games")
      .setValue("games")
      .setDescription("Roulette, Slots")
      .setEmoji(resolveMenuEmoji(eGames) as any),

    new StringSelectMenuOptionBuilder()
      .setLabel("Admin")
      .setValue("admin")
      .setDescription("Server Configuration & Management")
      .setEmoji(resolveMenuEmoji(eAdmin) as any),
  ];

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder().setCustomId("help_select").setPlaceholder("Select a category").addOptions(options)
  );

  const sent = await message.reply({ embeds: [overview], components: [row] });

  const collector = sent.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60_000,
    filter: (i) => i.user.id === message.author.id,
  });

  collector.on("collect", async (i) => {
    const val = i.values[0];
    let embed = new EmbedBuilder().setColor(Colors.Blurple);

    if (val === "economy") {
      embed.setTitle(`${eEconomy} Economy & Shop`)
        .addFields(
          { name: `\`${prefix}profile\``, value: "View your stats, net worth & credit score." },
          { name: `\`${prefix}bal [user]\``, value: "Check wallet and bank balance." },
          { name: `\`${prefix}lb [cash]\``, value: "View Server Leaderboard (Net worth or Cash)." },
          { name: `\`${prefix}shop\``, value: "View and buy items from the store." },
          { name: `\`${prefix}inv\``, value: "View your purchased items." },
          { name: `\`${prefix}dep <amount|all>\``, value: "Deposit money to bank." },
          { name: `\`${prefix}with <amount|all>\``, value: "Withdraw money from bank." },
          { name: `\`${prefix}rob <user>\``, value: "Attempt to steal from a user." },
          { name: `\`${prefix}transfer <amount> <user>\``, value: "Gift money to another user." }
        );
    } 
    else if (val === "income") {
      embed.setTitle(`${eIncome} Income Commands`)
        .addFields(
          { name: `\`${prefix}work\``, value: "Earn standard income." },
          { name: `\`${prefix}beg\``, value: "Small earnings with low cooldown." },
          { name: `\`${prefix}crime\``, value: "High risk, high reward." },
          { name: `\`${prefix}slut\``, value: "Risky income command." }
        );
    }
    else if (val === "games") {
      embed.setTitle(`${eGames} Games`)
        .addFields(
          { name: `\`${prefix}bet <amount> <choice>\``, value: "Play Roulette (Red, Black, Odd, Even, 0-36)." }
        );
    }
    else if (val === "admin") {
      const member = i.member as GuildMember;
      if (!member || !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await i.reply({ content: "🚫 **Access Denied:** Administrators only.", ephemeral: true });
        return;
      }

      embed.setTitle(`${eAdmin} Admin Configuration`)
        .addFields(
          { name: "🏦 **Economy Control**", value: 
            `\`${prefix}addmoney <user> <amount>\`\n` +
            `\`${prefix}removemoney <user> <amount> [bank]\`\n` +
            `\`${prefix}reseteconomy confirm\``
          },
          { name: "🛒 **Shop Management**", value: 
            `\`${prefix}shopadd <price> <name>\` (Quick Add)\n` +
            `\`${prefix}manageitem [name]\` (Interactive Edit/Delete)` 
          },
          { name: "⚙️ **Settings**", value: 
            `\`${prefix}setprefix <symbol>\`\n` +
            `\`${prefix}setemoji <emoji>\`\n` +
            `\`${prefix}setstartmoney <amount>\``
          },
          { name: "👮 **Robbery Settings**", value: 
            `\`${prefix}setrob success <0-100>\`\n` +
            `\`${prefix}setrob fine <0-100>\`\n` +
            `\`${prefix}setrob cooldown <seconds>\`\n` +
            `\`${prefix}setrob immunity <add/remove> <role>\``
          },
          { name: "💰 **Income Settings**", value: 
            `\`${prefix}setincome <cmd> <min|max> <amount>\`\n` +
            `\`${prefix}setincomecooldown <cmd> <seconds>\`` 
          }
        );
    }

    await i.reply({ embeds: [embed], ephemeral: true });
  });
}