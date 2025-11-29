// src/commands/admin/setCurrencyEmoji.ts
import { Message } from "discord.js";
import { updateGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleSetCurrencyEmoji(message: Message, args: string[]) {
  try {
    if (!message.member?.permissions.has("Administrator")) {
      return message.reply({ embeds: [errorEmbed(message.author, "No Permission", "Admins only.")] });
    }

    const newEmoji = args[0];
    if (!newEmoji) {
      return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!setemoji <emoji>`")] });
    }

    // Update config
    await updateGuildConfig(message.guildId!, { currencyEmoji: newEmoji });

    return message.reply({
      embeds: [successEmbed(message.author, "Emoji Updated", `Currency emoji set to: ${newEmoji}`)]
    });

  } catch (err) {
    console.error("handleSetCurrencyEmoji error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Internal Error", "Failed to set emoji.")] });
  }
}