import {
  Message,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
  EmbedBuilder,
  Colors
} from "discord.js";
import prisma from "../../utils/prisma";

export async function handleSetTheme(message: Message, args: string[]) {
  const options = [
    new StringSelectMenuOptionBuilder().setLabel("Neon Noir").setValue("neon_noir").setDescription("Dark city vibes with glowing neon").setEmoji("🌆"),
    new StringSelectMenuOptionBuilder().setLabel("Sunset Miami").setValue("sunset").setDescription("Retro 80s synthwave aesthetic").setEmoji("🌅"),
    new StringSelectMenuOptionBuilder().setLabel("Samurai").setValue("samurai").setDescription("Ancient Japan ink style").setEmoji("⚔️"),
    new StringSelectMenuOptionBuilder().setLabel("Egyptian").setValue("egyptian").setDescription("Gold carvings & hieroglyphs").setEmoji("👑"),
    new StringSelectMenuOptionBuilder().setLabel("Frozen").setValue("frozen").setDescription("Icy, frosted glass look").setEmoji("🧊"),
    new StringSelectMenuOptionBuilder().setLabel("Inferno").setValue("inferno").setDescription("Fiery ember aesthetic").setEmoji("🔥"),
    new StringSelectMenuOptionBuilder().setLabel("Joker Chaos").setValue("joker").setDescription("Glitchy, chaotic neon").setEmoji("🎭"),
    new StringSelectMenuOptionBuilder().setLabel("Cosmic").setValue("cosmic").setDescription("Space & galaxy stars").setEmoji("🌌"),
    new StringSelectMenuOptionBuilder().setLabel("Steampunk").setValue("steampunk").setDescription("Brass, gears & leather").setEmoji("🪙"),
    new StringSelectMenuOptionBuilder().setLabel("Holographic").setValue("holo").setDescription("Rainbow iridescent glass").setEmoji("🟣"),
    new StringSelectMenuOptionBuilder().setLabel("Marble Luxury").setValue("marble").setDescription("White marble & gold veins").setEmoji("⚪"),
    new StringSelectMenuOptionBuilder().setLabel("Casino Classic").setValue("casino").setDescription("Red velvet & poker chips").setEmoji("🃏"),
    new StringSelectMenuOptionBuilder().setLabel("Luxurious Obsidian").setValue("obsidian").setDescription("Matte black & gold elite style").setEmoji("🪙"),
    new StringSelectMenuOptionBuilder().setLabel("Glassmorphism Pro").setValue("glass").setDescription("Frosted glass & soft gradients").setEmoji("🔮"),
    new StringSelectMenuOptionBuilder().setLabel("Midnight Prism").setValue("prism").setDescription("Deep space & sharp crystals").setEmoji("💎"),
  ];

  // Embed to show the user what they are selecting
  const embed = new EmbedBuilder()
    .setTitle("🎨 Profile Theme Selection")
    .setDescription("Select a theme from the dropdown menu below to customize your `!profile` card.\n\n**Available Themes:**")
    .addFields(
      { name: "🌆 Neon Noir", value: "Cyberpunk aesthetic.", inline: true },
      { name: "🌅 Sunset", value: "Vaporwave style.", inline: true },
      { name: "⚔️ Samurai", value: "Japanese ink style.", inline: true },
      { name: "👑 Egyptian", value: "Gold & hieroglyphs.", inline: true },
      { name: "🧊 Frozen", value: "Ice & frosted glass.", inline: true },
      { name: "🔥 Inferno", value: "Fire & magma.", inline: true },
      { name: "🎭 Joker", value: "Chaotic neon.", inline: true },
      { name: "🌌 Cosmic", value: "Space & stars.", inline: true },
      { name: "🪙 Steampunk", value: "Brass & gears.", inline: true },
      { name: "🟣 Holo", value: "Iridescent glass.", inline: true },
      { name: "⚪ Marble", value: "Luxury stone.", inline: true },
      { name: "🃏 Casino", value: "Classic red felt.", inline: true },
      { name: "🪙 Obsidian", value: "Premium black & gold.", inline: true },
      { name: "🔮 Glass", value: "Premium modern glass.", inline: true },
      { name: "💎 Prism", value: "Premium deep space.", inline: true }
    )
    .setColor(Colors.Blurple)
    .setFooter({ text: "Selection time: 60 seconds" });

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("theme_select")
      .setPlaceholder("Select a profile theme...")
      .addOptions(options)
  );

  const msg = await message.reply({ embeds: [embed], components: [row] });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60000,
    filter: i => i.user.id === message.author.id
  });

  collector.on("collect", async (i) => {
    const theme = i.values[0];

    // Update user preference in the database
    await prisma.user.upsert({
      where: { discordId: message.author.id },
      create: {
        discordId: message.author.id,
        username: message.author.username,
        profileTheme: theme
      },
      update: { profileTheme: theme }
    });

    await i.update({
      content: `✅ Profile theme updated to **${theme}**! Check it with \`!profile\`.`,
      embeds: [],
      components: []
    });
  });

  collector.on("end", () => {
    if (msg.editable) msg.edit({ components: [] }).catch(() => { });
  });
}