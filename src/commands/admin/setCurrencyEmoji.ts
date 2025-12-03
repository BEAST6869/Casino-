import { Message } from "discord.js";
import { updateGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleSetCurrencyEmoji(message: Message, args: string[]) {
  try {
    if (!message.member?.permissions.has("Administrator")) {
      return message.reply({ embeds: [errorEmbed(message.author, "No Permission", "Admins only.")] });
    }

    const input = args[0];
    if (!input) {
      return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!setemoji <emoji_name | emoji_id | emoji>`")] });
    }

    let finalEmoji = input;
    const guildEmojis = message.guild?.emojis.cache;

    // 1. Check if input is a raw ID (e.g. "123456789")
    if (/^\d+$/.test(input)) {
      const foundEmoji = guildEmojis?.get(input);
      if (foundEmoji) {
        finalEmoji = foundEmoji.toString(); // <a:name:id>
      } else {
        return message.reply({ 
          embeds: [errorEmbed(message.author, "Not Found", `Emoji ID \`${input}\` not found in this server.`)] 
        });
      }
    } 
    // 2. Check if input is a Name (e.g. "coin")
    // matches alphanumeric names, ignores if it looks like <...>, unicode, or symbols
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
    
    // 3. Otherwise assume it's already a valid unicode (🪙) or full string (<:coin:123>)
    // We save it as-is.

    await updateGuildConfig(message.guildId!, { currencyEmoji: finalEmoji });

    return message.reply({
      embeds: [successEmbed(message.author, "Emoji Updated", `Currency emoji set to: ${finalEmoji}`)]
    });

  } catch (err) {
    console.error("handleSetCurrencyEmoji error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Internal Error", "Failed to set emoji.")] });
  }
}