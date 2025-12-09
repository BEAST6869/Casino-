import { Message, PermissionsBitField } from "discord.js";
import { getGuildConfig, updateGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { parseDurationToDays, formatDuration } from "../../utils/format";

export async function handleConfigCreditTier(message: Message, args: string[]) {
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "Admins only.")] });
    }

    // Schema: !configcredittier <minScore> <maxLoan> <duration>
    const minScore = parseInt(args[0]);
    const maxLoan = parseInt(args[1]);
    const durationStr = args.slice(2).join(" ");
    const maxDays = parseDurationToDays(durationStr);

    const config = await getGuildConfig(message.guildId!);

    if (isNaN(minScore) || isNaN(maxLoan) || maxDays === null || maxDays <= 0) {
        return message.reply({
            embeds: [errorEmbed(message.author, "Invalid Usage", `Usage: \`${config.prefix}configcredittier <minScore> <maxLoan> <duration>\`\nExample: \`${config.prefix}configcredittier 500 50000 7d\``)]
        });
    }

    let currentConfig = (config.creditConfig as any[]) || [];

    // Find if tier exists
    const index = currentConfig.findIndex((c: any) => c.minScore === minScore);
    if (index === -1) {
        return message.reply({
            embeds: [errorEmbed(message.author, "Tier Not Found", `No credit tier found for score **${minScore}**.\nUse \`${config.prefix}addcredittier\` to create one.`)]
        });
    }

    // Update existing tier
    currentConfig[index] = { minScore, maxLoan, maxDays };

    // Sort by score
    currentConfig.sort((a: any, b: any) => a.minScore - b.minScore);

    await updateGuildConfig(message.guildId!, { creditConfig: currentConfig });

    const tiersList = currentConfig.map((c: any) => `• Score **${c.minScore}+** → Max Loan: **${c.maxLoan}** (${formatDuration(Math.round(c.maxDays * 86400000))})`).join("\n");

    return message.reply({
        embeds: [successEmbed(message.author, "<a:credits:1445689337172721716> Credit Tier Updated", `Successfully configured tier for Score **${minScore}+**.\n\n**Current Tiers:**\n${tiersList}`)]
    });
}
