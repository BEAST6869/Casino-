
import { Message, PermissionsBitField } from "discord.js";
import { getGuildConfig, updateGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { parseDurationToDays, formatDuration } from "../../utils/format";

export async function handleSetCreditConfig(message: Message, args: string[]) {
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "Admins only.")] });
    }

    // Schema: !set-credit-config <minScore> <maxLoan> <days>
    // args from router are ["500", "50000", "7"] or ["500", "50000", "1d", "12h"]
    const minScore = parseInt(args[0]);
    const maxLoan = parseInt(args[1]);
    const durationStr = args.slice(2).join(" ");
    const maxDays = parseDurationToDays(durationStr);

    const config = await getGuildConfig(message.guildId!);

    if (isNaN(minScore) || isNaN(maxLoan) || maxDays === null || maxDays <= 0) {
        return message.reply({
            embeds: [errorEmbed(message.author, "Invalid Usage", `Usage: \`${config.prefix}set-credit-config <minScore> <maxLoan> <duration>\`\nExample: \`${config.prefix}set-credit-config 500 50000 7d\` or \`1d 12h\``)]
        });
    }

    let currentConfig = (config.creditConfig as any[]) || [];

    // Remove existing config for this exact score if exists, or just add new one
    currentConfig = currentConfig.filter((c: any) => c.minScore !== minScore);

    currentConfig.push({ minScore, maxLoan, maxDays });

    // Sort by score
    currentConfig.sort((a: any, b: any) => a.minScore - b.minScore);

    await updateGuildConfig(message.guildId!, { creditConfig: currentConfig });

    const tiersList = currentConfig.map((c: any) => `• Score **${c.minScore}+** → Max Loan: **${c.maxLoan}** (${formatDuration(Math.round(c.maxDays * 86400000))})`).join("\n");

    return message.reply({
        embeds: [successEmbed(message.author, "<a:credits:1445689337172721716> Credit Config Updated", `Added tier for Score **${minScore}**.\n\n**Current Tiers:**\n${tiersList}`)]
    });
}
