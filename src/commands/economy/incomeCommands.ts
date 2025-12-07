import { Message } from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { runIncomeCommand } from "../../services/incomeService";
import { getGuildConfig } from "../../services/guildConfigService"; // Cached Config
import { successEmbed, errorEmbed } from "../../utils/embed";
import { fmtCurrency } from "../../utils/format";
import { logToChannel } from "../../utils/discordLogger";

export async function handleIncome(message: Message) {
  const [cmd] = message.content.slice(1).split(/\s+/);
  const commandKey = cmd.toLowerCase();

  if (!["work", "crime", "beg", "slut"].includes(commandKey)) {
    return message.reply({ embeds: [errorEmbed(message.author, "Unknown", "Use: !work, !crime, !beg or !slut")] });
  }

  // 1. Fetch Config (Instant Cache)
  const config = await getGuildConfig(message.guildId!);
  const emoji = config.currencyEmoji;

  const user = await ensureUserAndWallet(message.author.id, message.author.tag);

  try {
    const res = await runIncomeCommand({
      commandKey,
      discordId: message.author.id,
      guildId: message.guildId ?? null,
      userId: user.id,
      walletId: user.wallet!.id
    });

    if (res.success) {
      // Log Success
      await logToChannel(message.client, {
        guild: message.guild!,
        type: "ECONOMY",
        title: `Income Success (${commandKey})`,
        description: `**User:** ${message.author.tag}\n**Amount:** ${fmtCurrency(res.amount, emoji)}`,
        color: 0x00FF00
      });

      return message.reply({
        embeds: [successEmbed(message.author, `${commandKey.toUpperCase()} SUCCESS`, `You earned **${fmtCurrency(res.amount, emoji)}**!`)]
      });
    } else {
      // Log Failure (Penalty)
      await logToChannel(message.client, {
        guild: message.guild!,
        type: "ECONOMY",
        title: `Income Failed (${commandKey})`,
        description: `**User:** ${message.author.tag}\n**Penalty:** ${fmtCurrency(Math.abs(res.amount), emoji)}`,
        color: 0xFF0000
      });

      return message.reply({
        embeds: [errorEmbed(message.author, `${commandKey.toUpperCase()} FAILED`, `You lost **${fmtCurrency(Math.abs(res.amount), emoji)}**!`)]
      });
    }
  } catch (err) {
    return message.reply({ embeds: [errorEmbed(message.author, "Cooldown", (err as Error).message)] });
  }
}