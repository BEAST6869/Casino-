// src/commands/admin/addEmoji.ts
import { Message } from "discord.js";
import { setPersistedEmoji, getEmojiRecord } from "../../utils/emojiRegistry";
import { successEmbed, errorEmbed } from "../../utils/embed";

/**
 * Usage:
 *  !addemoji <key> <emoji|emojiId>
 * Examples:
 *  !addemoji coin <:coin:1443857913637507144>
 *  !addemoji coin 1443857913637507144
 */
export async function handleAddEmoji(message: Message, args: string[]) {
  try {
    if (!message.member?.permissions.has("Administrator")) {
      return message.reply({ embeds: [errorEmbed(message.author, "No permission", "Admins only.")] });
    }

    const key = args[0];
    const emojiArg = args[1];

    if (!key || !emojiArg) {
      return message.reply({ embeds: [errorEmbed(message.author, "Usage", "`!addemoji <key> <emoji|id>`")] });
    }

    // parse emoji mention like <a:name:id> or <:name:id>
    const mentionMatch = emojiArg.match(/<?a?:?(\w+):(\d+)>?/);
    let id: string | undefined;
    let name: string | undefined;

    if (mentionMatch) {
      name = mentionMatch[1];
      id = mentionMatch[2];
    } else if (/^\d+$/.test(emojiArg)) {
      // raw id
      id = emojiArg;
    } else {
      // try to find in guild cache by name
      const found = message.client.emojis.cache.find(e => e.name === emojiArg);
      if (found) {
        id = found.id;
        name = found.name;
      }
    }

    if (!id) {
      return message.reply({ embeds: [errorEmbed(message.author, "Invalid emoji", "Please provide a valid emoji mention or id")] });
    }

    // detect if animated from cache
    const cached = message.client.emojis.cache.get(id);
    const animated = !!cached?.animated;
    const rec = { id, name: name ?? cached?.name ?? key, animated };

    // persist & update registry
    setPersistedEmoji(key, rec);

    return message.reply({ embeds: [successEmbed(message.author, "Emoji mapped", `Key \`${key}\` → emoji id \`${id}\``)] });
  } catch (err) {
    console.error("handleAddEmoji error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Error", "Failed to map emoji")] });
  }
}
