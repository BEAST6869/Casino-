"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleHelp = handleHelp;
const discord_js_1 = require("discord.js");
const guildConfigService_1 = require("../../services/guildConfigService");
const emojiRegistry_1 = require("../../utils/emojiRegistry");
async function handleHelp(message) {
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const prefix = config.prefix;
    // --- EMOJI CONFIGURATION ---
    // 1. Economy (Animated Money)
    const idEconomy = "1445732360204193824";
    const strEconomy = `<a:money:${idEconomy}>`;
    // 2. Income (Server Currency)
    const incomeRaw = config.currencyEmoji;
    const idIncome = incomeRaw.match(/:(\d+)>/)?.[1] ?? (incomeRaw.match(/^\d+$/) ? incomeRaw : undefined);
    // 3. Games (Casino)
    const idGames = "1445732641545654383";
    const strGames = `<a:casino:${idGames}>`;
    // 4. Admin (Settings)
    const eAdminRaw = (0, emojiRegistry_1.emojiInline)("settings", message.guild) || "⚙️";
    const idAdmin = eAdminRaw.match(/:(\d+)>/)?.[1];
    // --- HELPER: Resolve Emoji for Dropdown ---
    const getMenuEmoji = (id, fallback = "❓") => {
        if (id && /^\d+$/.test(id))
            return { id };
        return fallback;
    };
    const overview = new discord_js_1.EmbedBuilder()
        .setTitle(`${config.currencyEmoji} Casino Bot — Help Menu`)
        .setDescription(`Use the dropdown below to explore commands.\nServer Prefix: \`${prefix}\``)
        .setColor(discord_js_1.Colors.DarkPurple)
        .setThumbnail(message.client.user?.displayAvatarURL() ?? null);
    const options = [
        new discord_js_1.StringSelectMenuOptionBuilder()
            .setLabel("Economy")
            .setValue("economy")
            .setDescription("Money, Banking, Shop, Leaderboard")
            .setEmoji(getMenuEmoji(idEconomy, "💰")),
        new discord_js_1.StringSelectMenuOptionBuilder()
            .setLabel("Income")
            .setValue("income")
            .setDescription("Work, Beg, Crime")
            .setEmoji(idIncome ? { id: idIncome } : (incomeRaw.match(/^\d+$/) ? { id: incomeRaw } : "💸")),
        new discord_js_1.StringSelectMenuOptionBuilder()
            .setLabel("Games")
            .setValue("games")
            .setDescription("Roulette, Slots, Blackjack, Coinflip")
            .setEmoji(getMenuEmoji(idGames, "🎰")),
        new discord_js_1.StringSelectMenuOptionBuilder()
            .setLabel("Admin")
            .setValue("admin")
            .setDescription("Server Configuration & Management")
            .setEmoji(idAdmin ? { id: idAdmin } : "⚙️"),
    ];
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder().setCustomId("help_select").setPlaceholder("Select a category").addOptions(options));
    const sent = await message.reply({ embeds: [overview], components: [row] });
    const collector = sent.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.StringSelect,
        time: 60000,
        filter: (i) => i.user.id === message.author.id,
    });
    collector.on("collect", async (i) => {
        const val = i.values[0];
        let embed = new discord_js_1.EmbedBuilder().setColor(discord_js_1.Colors.Blurple);
        if (val === "economy") {
            embed.setTitle(`${strEconomy} Economy & Shop`)
                .addFields({ name: `\`${prefix}profile\``, value: "View your stats, net worth & credit score." }, { name: `\`${prefix}bal [user]\``, value: "Check wallet and bank balance." }, { name: `\`${prefix}lb\``, value: "View Server Leaderboard (Net Worth)." }, { name: `\`${prefix}lb-wallet\``, value: "View Cash-only Leaderboard." }, { name: `\`${prefix}shop\``, value: "View and buy items from the store." }, { name: `\`${prefix}inv\``, value: "View your purchased items." }, { name: `\`${prefix}dep <amount|all>\``, value: "Deposit money to bank." }, { name: `\`${prefix}with <amount|all>\``, value: "Withdraw money from bank." }, { name: `\`${prefix}rob <user>\``, value: "Attempt to steal from a user." }, { name: `\`${prefix}transfer <amount> <user>\``, value: "Gift money to another user." });
        }
        else if (val === "income") {
            embed.setTitle(`${config.currencyEmoji} Income Commands`)
                .addFields({ name: `\`${prefix}work\``, value: "Earn standard income." }, { name: `\`${prefix}beg\``, value: "Small earnings with low cooldown." }, { name: `\`${prefix}crime\``, value: "High risk, high reward." }, { name: `\`${prefix}slut\``, value: "Risky income command." });
        }
        else if (val === "games") {
            embed.setTitle(`${strGames} Games`)
                .addFields({ name: `\`${prefix}bet <amount> <choice>\``, value: "Play Roulette (Red, Black, Odd, Even, 0-36)." }, { name: `\`${prefix}bj <amount>\``, value: "Play Blackjack against the dealer." }, { name: `\`${prefix}slots <amount>\``, value: "Spin the slot machine." }, { name: `\`${prefix}cf <amount> <h|t>\``, value: "Flip a coin (Heads/Tails)." });
        }
        else if (val === "admin") {
            const member = i.member;
            if (!member || !member.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
                await i.reply({ content: "🚫 **Access Denied:** Administrators only.", ephemeral: true });
                return;
            }
            const eSettings = (0, emojiRegistry_1.emojiInline)("settings", message.guild) || "⚙️";
            embed.setTitle(`${eSettings} Admin Configuration`)
                .addFields({ name: "🏦 **Economy Control**", value: `\`${prefix}addmoney <user> <amount>\`\n` +
                    `\`${prefix}removemoney <user> <amount> [bank]\`\n` +
                    `\`${prefix}reseteconomy confirm\``
            }, { name: "🛒 **Shop Management**", value: `\`${prefix}shopadd <price> <name>\` (Quick Add)\n` +
                    `\`${prefix}manageitem [name]\` (Interactive Edit/Delete)`
            }, { name: "⚙️ **Settings**", value: `\`${prefix}setprefix <symbol>\`\n` +
                    `\`${prefix}setemoji <emoji>\`\n` +
                    `\`${prefix}setstartmoney <amount>\`\n` +
                    `\`${prefix}minbet <amount>\``
            }, { name: "👮 **Robbery Settings**", value: `\`${prefix}setrob success <0-100>\`\n` +
                    `\`${prefix}setrob fine <0-100>\`\n` +
                    `\`${prefix}setrob cooldown <seconds>\`\n` +
                    `\`${prefix}setrob immunity <add/remove> <role>\``
            }, { name: "💰 **Income Settings**", value: `\`${prefix}setincome <cmd> <min|max> <amount>\`\n` +
                    `\`${prefix}setincomecooldown <cmd> <seconds>\``
            });
        }
        await i.reply({ embeds: [embed], ephemeral: false });
    });
}
//# sourceMappingURL=help.js.map