// src/commands/admin/setIncomeCooldown.ts
import { Message } from "discord.js";
import prisma from "../../utils/prisma";
import { successEmbed, errorEmbed } from "../../utils/embed";

const SUPPORTED = ["work", "beg", "crime", "slut"];

export async function handleSetIncomeCooldown(message: Message, args: string[]) {
  try {
    if (!message.member?.permissions.has("Administrator")) {
      return message.reply({ embeds: [errorEmbed(message.author, "No Permission", "Admins only.")] });
    }

    const cmd = (args[0] ?? "").toLowerCase();
    const seconds = Math.floor(Number(args[1] ?? NaN));

    if (!SUPPORTED.includes(cmd) || !Number.isFinite(seconds) || seconds < 0) {
      return message.reply({
        embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!setincomecooldown <work|beg|crime|slut> <seconds>`")]
      });
    }

    await prisma.incomeConfig.upsert({
      where: { guildId_commandKey: { guildId: message.guildId!, commandKey: cmd } },
      create: { guildId: message.guildId!, commandKey: cmd, minPay: 10, maxPay: 50, cooldown: seconds, successPct: 100 },
      update: { cooldown: seconds }
    });

    return message.reply({
      embeds: [successEmbed(message.author, "Cooldown Updated", `Set **${cmd}** cooldown to **${seconds}s**`)]
    });
  } catch (err) {
    console.error("handleSetIncomeCooldown error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Internal Error", "Failed to set cooldown.")] });
  }
}
