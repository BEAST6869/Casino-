"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetTheme = handleSetTheme;
const discord_js_1 = require("discord.js");
const prisma_1 = __importDefault(require("../../utils/prisma"));
const guildConfigService_1 = require("../../services/guildConfigService");
async function handleSetTheme(message, args) {
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const options = [
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Neon Noir").setValue("neon_noir").setDescription("Dark city vibes with glowing neon").setEmoji("🌆"),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Sunset Miami").setValue("sunset").setDescription("Retro 80s synthwave aesthetic").setEmoji("🌅"),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Samurai").setValue("samurai").setDescription("Ancient Japan ink style").setEmoji("⚔️"),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Egyptian").setValue("egyptian").setDescription("Gold carvings & hieroglyphs").setEmoji("👑"),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Frozen").setValue("frozen").setDescription("Icy, frosted glass look").setEmoji("🧊"),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Inferno").setValue("inferno").setDescription("Fiery ember aesthetic").setEmoji("🔥"),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Joker Chaos").setValue("joker").setDescription("Glitchy, chaotic neon").setEmoji("🎭"),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Cosmic").setValue("cosmic").setDescription("Space & galaxy stars").setEmoji("🌌"),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Steampunk").setValue("steampunk").setDescription("Brass, gears & leather").setEmoji("🪙"),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Holographic").setValue("holo").setDescription("Rainbow iridescent glass").setEmoji("🟣"),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Marble Luxury").setValue("marble").setDescription("White marble & gold veins").setEmoji("⚪"),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Casino Classic").setValue("casino").setDescription("Red velvet & poker chips").setEmoji("🃏"),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Luxurious Obsidian").setValue("obsidian").setDescription("Matte black & gold elite style").setEmoji("🪙"),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Glassmorphism Pro").setValue("glass").setDescription("Frosted glass & soft gradients").setEmoji("🔮"),
        new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Midnight Prism").setValue("prism").setDescription("Deep space & sharp crystals").setEmoji("💎"),
    ];
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle("🎨 Profile Theme Selection")
        .setDescription(`Select a theme from the dropdown menu below to customize your \`${config.prefix}profile\` card.\n\n**Available Themes:**`)
        .addFields({ name: "🌆 Neon Noir", value: "Cyberpunk aesthetic.", inline: true }, { name: "🌅 Sunset", value: "Vaporwave style.", inline: true }, { name: "⚔️ Samurai", value: "Japanese ink style.", inline: true }, { name: "👑 Egyptian", value: "Gold & hieroglyphs.", inline: true }, { name: "🧊 Frozen", value: "Ice & frosted glass.", inline: true }, { name: "🔥 Inferno", value: "Fire & magma.", inline: true }, { name: "🎭 Joker", value: "Chaotic neon.", inline: true }, { name: "🌌 Cosmic", value: "Space & stars.", inline: true }, { name: "🪙 Steampunk", value: "Brass & gears.", inline: true }, { name: "🟣 Holo", value: "Iridescent glass.", inline: true }, { name: "⚪ Marble", value: "Luxury stone.", inline: true }, { name: "🃏 Casino", value: "Classic red felt.", inline: true }, { name: "🪙 Obsidian", value: "Premium black & gold.", inline: true }, { name: "🔮 Glass", value: "Premium modern glass.", inline: true }, { name: "💎 Prism", value: "Premium deep space.", inline: true })
        .setColor(discord_js_1.Colors.Blurple)
        .setFooter({ text: "Selection time: 60 seconds" });
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId("theme_select")
        .setPlaceholder("Select a profile theme...")
        .addOptions(options));
    const msg = await message.reply({ embeds: [embed], components: [row] });
    const collector = msg.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.StringSelect,
        time: 60000,
        filter: i => i.user.id === message.author.id
    });
    collector.on("collect", async (i) => {
        const theme = i.values[0];
        await prisma_1.default.user.upsert({
            where: { discordId_guildId: { discordId: message.author.id, guildId: message.guildId } },
            create: {
                discordId: message.author.id,
                guildId: message.guildId,
                username: message.author.username,
                profileTheme: theme
            },
            update: { profileTheme: theme }
        });
        await i.update({
            content: `✅ Profile theme updated to **${theme}**! Check it with \`${config.prefix}profile\`.`,
            embeds: [],
            components: []
        });
    });
    collector.on("end", () => {
        if (msg.editable)
            msg.edit({ components: [] }).catch(() => { });
    });
}
//# sourceMappingURL=setTheme.js.map