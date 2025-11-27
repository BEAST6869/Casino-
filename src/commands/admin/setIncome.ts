// src/commands/admin/setIncome.ts
import { Message, PermissionFlagsBits } from "discord.js";
import prisma from "../../utils/prisma";
import { successEmbed, errorEmbed } from "../../utils/embed";

/**
 * Usage: !setincome <commandKey> <min> <max> <cooldownSec> [successPct]
 * Example: !setincome work 50 150 60 100
 */
export async function handleSetIncome(message: Message, args: string[]) {
  try {
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [errorEmbed(message.author, "No Permission", "Administrator permission required.")] });
    }

    const commandKey = args[0];
    const min = Math.floor(Number(args[1] ?? 0));
    const max = Math.floor(Number(args[2] ?? 0));
    const cooldown = Math.floor(Number(args[3] ?? 0));
    const successPct = args[4] !== undefined ? Math.floor(Number(args[4])) : undefined;

    if (!commandKey || min <= 0 || max <= 0 || cooldown <= 0 || min > max) {
      return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "Example: `!setincome work 50 150 60 100`")] });
    }

    const guildId = message.guildId!;
    await prisma.incomeConfig.upsert({
      where: { guildId_commandKey: { guildId, commandKey } },
      update: { minPay: min, maxPay: max, cooldown, successPct },
      create: { guildId, commandKey, minPay: min, maxPay: max, cooldown, successPct }
    });

    return message.reply({
      embeds: [successEmbed(message.author, "Income Config Updated", `**${commandKey}** set to ${min}-${max} coins, cooldown ${cooldown}s, success ${successPct ?? "default"}`)]
    });
  } catch (err) {
    console.error("handleSetIncome error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Internal Error", "Failed to update income config.")] });
  }
}
