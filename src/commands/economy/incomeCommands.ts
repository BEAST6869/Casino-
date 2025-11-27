// src/commands/economy/incomeCommands.ts
import { Message } from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { runIncomeCommand } from "../../services/incomeService";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleIncome(message: Message) {
  const [cmd] = message.content.slice(1).split(/\s+/);
  const commandKey = cmd.toLowerCase();

  if (!["work", "crime", "beg", "slut"].includes(commandKey)) {
    return message.reply({ embeds: [errorEmbed(message.author, "Unknown Command", "Use: !work, !crime, !beg or !slut")] });
  }

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
      return message.reply({ embeds: [successEmbed(message.author, `${commandKey.toUpperCase()} SUCCESS`, `You earned **${res.amount}** coins!`)] });
    } else {
      return message.reply({ embeds: [errorEmbed(message.author, `${commandKey.toUpperCase()} FAILED`, `You lost **${-res.amount}** coins!`)] });
    }
  } catch (err) {
    return message.reply({ embeds: [errorEmbed(message.author, "Cooldown Active", (err as Error).message)] });
  }
}
