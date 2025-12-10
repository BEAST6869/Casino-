// src/commands/admin/setIncome.ts
import { Message } from "discord.js";
import prisma from "../../utils/prisma";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { parseSmartAmount, fmtCurrency } from "../../utils/format";
import { getGuildConfig } from "../../services/guildConfigService";

const SUPPORTED = ["work", "beg", "crime", "slut"];

export async function handleSetIncome(message: Message, args: string[]) {
  try {
    if (!message.member?.permissions.has("Administrator")) {
      return message.reply({ embeds: [errorEmbed(message.author, "No Permission", "Admins only.")] });
    }

    const cmd = (args[0] ?? "").toLowerCase();
    const field = (args[1] ?? "").toLowerCase();
    const raw = args[2];

    if (!cmd || !field || raw === undefined || !SUPPORTED.includes(cmd)) {
      return message.reply({
        embeds: [errorEmbed(
          message.author,
          "Invalid Usage",
          "Usage: `!setincome < work | beg | crime | slut > <min|max|cooldown|success|penalty> <value>`"
        )]
      });
    }

    // parse value
    const val = parseSmartAmount(raw);
    if (isNaN(val)) {
      return message.reply({ embeds: [errorEmbed(message.author, "Invalid Value", "Value must be a number (e.g. 50, 1k).")] });
    }

    // validation per field
    const updates: any = {};
    if (field === "min") {
      if (!Number.isInteger(val) || val < 0) return message.reply({ embeds: [errorEmbed(message.author, "Invalid min", "Must be non-negative integer")] });
      updates.minPay = Math.floor(val);
    } else if (field === "max") {
      if (!Number.isInteger(val) || val <= 0) return message.reply({ embeds: [errorEmbed(message.author, "Invalid max", "Must be positive integer")] });
      updates.maxPay = Math.floor(val);
    } else if (field === "cooldown") {
      if (!Number.isInteger(val) || val < 0) return message.reply({ embeds: [errorEmbed(message.author, "Invalid cooldown", "Must be non-negative integer seconds")] });
      updates.cooldown = Math.floor(val);
    } else if (field === "success") {
      if (!Number.isFinite(val) || val < 0 || val > 100) return message.reply({ embeds: [errorEmbed(message.author, "Invalid success%", "Must be between 0 and 100")] });
      updates.successPct = Math.floor(val);
    } else if (field === "penalty") {
      if (!Number.isFinite(val) || val < 0 || val > 100) return message.reply({ embeds: [errorEmbed(message.author, "Invalid penalty%", "Must be between 0 and 100")] });
      updates.failPenaltyPct = Math.floor(val);
    } else {
      return message.reply({ embeds: [errorEmbed(message.author, "Invalid field", "Allowed: min, max, cooldown, success, penalty")] });
    }

    const guildId = message.guildId!;
    const commandKey = cmd;

    const up = await prisma.incomeConfig.upsert({
      where: { guildId_commandKey: { guildId, commandKey } },
      create: {
        guildId,
        commandKey,
        minPay: (updates.minPay ?? (commandKey === "beg" ? 10 : 50)),
        maxPay: (updates.maxPay ?? 150),
        cooldown: (updates.cooldown ?? 60),
        successPct: (updates.successPct ?? 100),
        failPenaltyPct: (updates.failPenaltyPct ?? 50)
      },
      update: updates
    });

    const config = await getGuildConfig(guildId);
    const emoji = config.currencyEmoji;

    const formattedUpdates = Object.entries(updates).map(([k, v]) => {
      if (k === "minPay" || k === "maxPay") return `${k}=${fmtCurrency(v as number, emoji)}`;
      return `${k}=${v}`;
    }).join(", ");

    return message.reply({
      embeds: [successEmbed(message.author, "Income Config Updated", `**${commandKey}** updated: ${formattedUpdates || "no changes?"}`)]
    });

  } catch (err) {
    console.error("handleSetIncome error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Internal Error", "Failed to update income config.")] });
  }
}
