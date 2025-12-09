import { Message, PermissionsBitField } from "discord.js";
import { getGuildConfig, updateGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { parseDurationToDays, formatDuration } from "../../utils/format";

export async function handleAddCreditTier(message: Message, args: string[]) {
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "Admins only.")] });
    }

    // Schema: !addcredittier <minScore> <maxLoan> <duration>
    const minScore = parseInt(args[0]);
    const maxLoan = parseInt(args[1]);
    const durationStr = args.slice(2).join(" ");
    const maxDays = parseDurationToDays(durationStr);

    const config = await getGuildConfig(message.guildId!);

    if (isNaN(minScore) || isNaN(maxLoan) || maxDays === null || maxDays <= 0) {
        return message.reply({
            embeds: [errorEmbed(message.author, "Invalid Usage", `Usage: \`${config.prefix}addcredittier <minScore> <maxLoan> <duration>\`\nExample: \`${config.prefix}addcredittier 500 50000 7d\``)]
        });
    }

    let currentConfig = (config.creditConfig as any[]) || [];

    // Check if tier already exists
    const exists = currentConfig.some((c: any) => c.minScore === minScore);
    if (exists) {
        return message.reply({
            embeds: [errorEmbed(message.author, "Tier Exists", `A credit tier for score **${minScore}** already exists.\nUse \`${config.prefix}configcredittier\` to update it.`)]
        });
    }

    currentConfig.push({ minScore, maxLoan, maxDays });

    // Sort by score
    currentConfig.sort((a: any, b: any) => a.minScore - b.minScore);

    await updateGuildConfig(message.guildId!, { creditConfig: currentConfig });

    const tiersList = currentConfig.map((c: any) => `• Score **${c.minScore}+** → Max Loan: **${c.maxLoan}** (${formatDuration(Math.round(c.maxDays * 86400000))})`).join("\n");

    return message.reply({
        embeds: [successEmbed(message.author, "<a:credits:1445689337172721716> Credit Tier Added", `Successfully added new tier for Score **${minScore}+**.\n\n**Current Tiers:**\n${tiersList}`)]
    });
}
