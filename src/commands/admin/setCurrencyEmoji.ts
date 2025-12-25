import { Message } from "discord.js";
import { updateGuildConfig, getGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { canExecuteAdminCommand } from "../../utils/permissionUtils";

export async function handleSetCurrencyEmoji(message: Message, args: string[]) {
  try {
    if (!message.member || !(await canExecuteAdminCommand(message, message.member))) {
      return message.reply({ embeds: [errorEmbed(message.author, "No Permission", "Admins or Bot Commanders only.")] });
    }

    const input = args[0];
    if (!input) {
      const config = await getGuildConfig(message.guildId!);
      return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", `Usage: \`${config.prefix}setemoji <emoji_name | emoji_id | emoji>\``)] });
    }

    let finalEmoji = input;
    const guildEmojis = message.guild?.emojis.cache;

    if (/^\d+$/.test(input)) {
      const foundEmoji = guildEmojis?.get(input);
      if (foundEmoji) {
        finalEmoji = foundEmoji.toString();
      } else {
        return message.reply({
          embeds: [errorEmbed(message.author, "Not Found", `Emoji ID \`${input}\` not found in this server.`)]
        });
      }
    }
    else if (/^[a-zA-Z0-9_]+$/.test(input)) {
      const foundEmoji = guildEmojis?.find(e => e.name === input);
      if (foundEmoji) {
        finalEmoji = foundEmoji.toString();
      } else {
        return message.reply({
          embeds: [errorEmbed(message.author, "Not Found", `Emoji named \`${input}\` not found in this server.`)]
        });
      }
    }

    await updateGuildConfig(message.guildId!, { currencyEmoji: finalEmoji });

    return message.reply({
      embeds: [successEmbed(message.author, "Emoji Updated", `Currency emoji set to: ${finalEmoji}`)]
    });

  } catch (err) {
    console.error("handleSetCurrencyEmoji error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Internal Error", "Failed to set emoji.")] });
  }
}