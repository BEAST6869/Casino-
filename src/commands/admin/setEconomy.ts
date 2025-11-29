// src/commands/admin/setEconomyEmoji.ts
import { Message } from "discord.js";
import { updateGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";

/**
 * Usage:
 *  !seteconomyemoji <emoji|emojiId|name>
 */
export async function handleSetEconomyEmoji(message: Message, args: string[]) {
  try {
    if (!message.member?.permissions.has("Administrator")) {
      return message.reply({ embeds: [errorEmbed(message.author, "No permission", "Admins only.")] });
    }

    const arg = args[0];
    if (!arg) {
      return message.reply({ embeds: [errorEmbed(message.author, "Usage", "`!seteconomyemoji <emoji|id|name>`")] });
    }

    // parse mention like <a:name:id> or <:name:id>
    const mention = arg.match(/<?a?:?(\w+):(\d+)>?/);
    let id: string | undefined;
    let name: string | undefined;

    if (mention) {
      name = mention[1];
      id = mention[2];
    } else if (/^\d+$/.test(arg)) {
      id = arg;
    } else {
      // try find by name in client's emoji cache
      const foundByName = message.client.emojis.cache.find((e) => e.name === arg);
      if (foundByName) {
        id = foundByName.id;
        name = foundByName.name;
      }
    }

    if (!id) {
      return message.reply({ embeds: [errorEmbed(message.author, "Invalid emoji", "Provide a valid emoji mention, ID, or emoji name available to the bot.")] });
    }

    // determine name from cache if not provided
    const cached = message.client.emojis.cache.get(id);
    if (!name) name = cached?.name ?? undefined;

    // persist to guild config, converting null-ish to undefined to satisfy types
    await updateGuildConfig(message.guildId!, {
      economyEmojiId: id ?? undefined,
      economyEmojiName: name ?? undefined
    });

    return message.reply({
      embeds: [successEmbed(message.author, "Economy Emoji Set", `Saved emoji id \`${id}\` as the guild economy icon.`)]
    });
  } catch (err) {
    console.error("handleSetEconomyEmoji error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Error", "Failed to set economy emoji.")] });
  }
}
