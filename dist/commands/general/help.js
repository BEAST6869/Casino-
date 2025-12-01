"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleHelp = handleHelp;
const discord_js_1 = require("discord.js");
const guildConfigService_1 = require("../../services/guildConfigService"); // Cached Config
async function handleHelp(message) {
    try {
        // 1. Fetch Config (Instant Cache)
        const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
        const emoji = config.currencyEmoji;
        const prefix = config.prefix;
        const overview = new discord_js_1.EmbedBuilder()
            .setTitle(`${emoji} Casino Bot — Help Menu`)
            .setDescription(`Use the dropdown below to explore.\nServer Prefix: \`${prefix}\`\nEconomy Emoji: ${emoji}`)
            .setColor(discord_js_1.Colors.DarkPurple)
            .setThumbnail(message.client.user?.displayAvatarURL() ?? null);
        const options = [
            new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Economy").setValue("economy").setDescription("Wallet, Bank, Rob, Transfer").setEmoji("💰"),
            new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Income").setValue("income").setDescription("Work, Beg, Crime").setEmoji("💸"),
            new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Games").setValue("games").setDescription("Roulette, Slots").setEmoji("🎲"),
            new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Admin").setValue("admin").setDescription("Settings & Management").setEmoji("🛠️"),
        ];
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder().setCustomId("help_select").setPlaceholder("Select a category").addOptions(options));
        const sent = await message.reply({ embeds: [overview], components: [row] });
        const collector = sent.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.StringSelect,
            time: 60000,
            filter: (i) => i.user.id === message.author.id,
        });
        collector.on("collect", async (i) => {
            try {
                const val = i.values[0];
                let embed = new discord_js_1.EmbedBuilder().setColor(discord_js_1.Colors.Blurple);
                if (val === "economy") {
                    embed.setTitle("💰 Economy Commands")
                        .addFields({ name: `\`${prefix}bal [user]\``, value: "Check balance." }, { name: `\`${prefix}dep <amount|all>\``, value: "Deposit to bank." }, { name: `\`${prefix}with <amount|all>\``, value: "Withdraw from bank." }, { name: `\`${prefix}rob <user>\``, value: "Steal from someone's wallet." }, { name: `\`${prefix}transfer <amount> <user>\``, value: "Gift money." });
                }
                else if (val === "income") {
                    embed.setTitle("💸 Income Commands")
                        .addFields({ name: `\`${prefix}work\``, value: "Earn standard income." }, { name: `\`${prefix}beg\``, value: "Small earnings." }, { name: `\`${prefix}crime\``, value: "High risk, high reward." }, { name: `\`${prefix}slut\``, value: "Risky income." });
                }
                else if (val === "games") {
                    embed.setTitle("🎲 Games")
                        .addFields({ name: `\`${prefix}bet <amount> <choice>\``, value: "Roulette (red, black, 0-36)." });
                }
                else if (val === "admin") {
                    // SAFER CHECK: Use i.memberPermissions which handles API members correctly
                    if (!i.memberPermissions?.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
                        await i.reply({ content: "🚫 You need **Administrator** permissions to view this section.", ephemeral: true });
                        return;
                    }
                    embed.setTitle("🛠️ Admin Config")
                        .addFields({ name: `\`${prefix}setemoji <emoji>\``, value: "Set economy currency symbol." }, { name: `\`${prefix}setrob success <0-100>\``, value: "Set rob success rate." }, { name: `\`${prefix}setrob fine <0-100>\``, value: "Set rob fine percentage." }, { name: `\`${prefix}setrob cooldown <sec>\``, value: "Set rob cooldown." }, { name: `\`${prefix}setrob immunity <add|remove> <role>\``, value: "Manage rob immunity roles." }, { name: `\`${prefix}setincome <cmd> <field> <val>\``, value: "Configure income amounts." }, { name: `\`${prefix}setincomecooldown <cmd> <sec>\``, value: "Quick set income cooldowns." }, { name: `\`${prefix}addmoney <user> <amount>\``, value: "Spawn money." }, { name: `\`${prefix}setstartmoney <amount>\``, value: "Set starting balance." }, { name: `\`${prefix}setprefix <symbol>\``, value: "Change bot prefix." }, { name: `\`${prefix}viewconfig\``, value: "View current server settings." }, { name: `\`${prefix}reseteconomy confirm\``, value: "⚠ Wipe all economy data." });
                }
                await i.reply({ embeds: [embed], ephemeral: true });
            }
            catch (err) {
                console.error("Help Menu Interaction Error:", err);
                if (!i.replied && !i.deferred) {
                    await i.reply({ content: "An error occurred while handling your selection.", ephemeral: true });
                }
            }
        });
    }
    catch (err) {
        console.error("Help Command Error:", err);
        await message.reply("An error occurred while opening the help menu.");
    }
}
//# sourceMappingURL=help.js.map