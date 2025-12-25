import { Message, EmbedBuilder } from "discord.js";
import { getGuildConfig, updateGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { formatDuration } from "../../utils/format";
import { canExecuteAdminCommand } from "../../utils/permissionUtils";

export async function handleViewCreditTiers(message: Message) {
    if (!message.member || !(await canExecuteAdminCommand(message, message.member))) {
        return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "Admins or Bot Commanders only.")] });
    }

    const config = await getGuildConfig(message.guildId!);
    const tiers = (config.creditConfig as any[]) || [];
    if (tiers.length === 0) {
        return message.reply({
            embeds: [errorEmbed(message.author, "Credit Tiers", "No custom credit tiers configured.")]
        });
    }

    tiers.sort((a: any, b: any) => a.minScore - b.minScore);
    const desc = tiers.map((c: any) =>
        `• **Score ${c.minScore}+**\n   Max Loan: ${config.currencyEmoji} ${c.maxLoan}\n   Duration: ${formatDuration(Math.round(c.maxDays * 86400000))}`
    ).join("\n\n");

    const embed = new EmbedBuilder()
        .setTitle("<a:credits:1445689337172721716> Credit Configuration Tiers")
        .setDescription(desc)
        .setColor(0x00AAFF)
        .setFooter({ text: `Use ${config.prefix}delete-credit-tier <score> to remove one.` });

    return message.reply({ embeds: [embed] });
}

export async function handleDeleteCreditTier(message: Message, args: string[]) {
    if (!message.member || !(await canExecuteAdminCommand(message, message.member))) {
        return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "Admins or Bot Commanders only.")] });
    }

    const score = parseInt(args[0]);
    if (isNaN(score)) {
        const config = await getGuildConfig(message.guildId!);
        return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", `Usage: \`${config.prefix}delete-credit-tier <minScore>\``)] });
    }

    const config = await getGuildConfig(message.guildId!);
    let tiers = (config.creditConfig as any[]) || [];
    const originalLength = tiers.length;
    tiers = tiers.filter((c: any) => c.minScore !== score);

    if (tiers.length === originalLength) {
        return message.reply({
            embeds: [errorEmbed(message.author, "Not Found", `No tier found with minScore **${score}**.`)]
        });
    }

    await updateGuildConfig(message.guildId!, { creditConfig: tiers });
    return message.reply({
        embeds: [successEmbed(message.author, "Tier Deleted", `Successfully removed credit tier for score **${score}+**.`)]
    });
}