
import { Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import { getFinancialSummary } from "../../services/bankingService";
import { getGuildConfig } from "../../services/guildConfigService";

export const data = {
    name: "bank",
    description: "Manage your finances: Loans, Investments, and Credit Score.",
    // Use slash command definition if adapting to slash, but user asked for interactive dashboard
    // which works well with !bank
};

export async function execute(message: Message | any, args: string[]) {
    // Support both message and slash command roughly
    const user = message.author || message.user;
    const guildId = message.guildId;

    if (!user || !guildId) return;

    const summary = await getFinancialSummary(user.id);
    const config = await getGuildConfig(guildId);

    const embed = new EmbedBuilder()
        .setTitle(`<:bankk:1445689134181126167> ${user.username}'s Financial Dashboard`)
        .setColor("#FFD700") // Gold
        .setThumbnail(user.displayAvatarURL())
        .setDescription(`Welcome to the ${config.currencyName} Bank. Manage your assets and liabilities here.`)
        .addFields(
            { name: "<:MoneyBag:1446970451606896781> Net Worth", value: `${config.currencyEmoji} ${summary.netWorth.toLocaleString()}`, inline: true },
            { name: "<a:credits:1445689337172721716> Credit Score", value: `${summary.creditScore}`, inline: true },
            {
                name: "<:OnLoan:1446971056865935381> Active Loans", value: summary.activeLoans.length > 0
                    ? `**${summary.activeLoans.length} Active**\n(Use \`!credit\` for details)`
                    : "None", inline: true
            },
            { name: "<:graph:1445689267861979197> Investments", value: `${summary.investments.length} Active`, inline: true }
        )
        .setFooter({ text: "Use the buttons below to navigate." });

    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("bank_deposit_withdraw")
                .setLabel("Deposit/Withdraw")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("1446974393463869600"),
            new ButtonBuilder()
                .setCustomId("bank_loans")
                .setLabel("Loans")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("1446971056865935381"), // OnLoan ID only
            new ButtonBuilder()
                .setCustomId("bank_invest")
                .setLabel("Investments")
                .setStyle(ButtonStyle.Success)
                .setEmoji("1445689267861979197"), // Graph ID only
            new ButtonBuilder()
                .setCustomId("bank_refresh")
                .setLabel("Refresh")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("1446971490078560287") // Refresh ID only
        );

    if (message.reply) {
        await message.reply({ embeds: [embed], components: [row] });
    } else {
        // Slash command
        await message.reply({ embeds: [embed], components: [row] });
    }
}
