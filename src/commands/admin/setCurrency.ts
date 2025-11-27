// src/commands/admin/setCurrency.ts
import { Message } from "discord.js";
import { updateGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleSetCurrency(message: Message, args: string[]) {
  try {
    if (!message.member?.permissions.has("Administrator")) {
      return message.reply({ embeds: [errorEmbed(message.author, "No Permission", "Admins only.")] });
    }
    const name = args.join(" ").trim();
    if (!name) return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "`!setcurrency <name>`")] });

    await updateGuildConfig(message.guildId!, { currencyName: name });
    return message.reply({ embeds: [successEmbed(message.author, "Currency Updated", `Currency set to **${name}**`)] });
  } catch (err) {
    console.error("handleSetCurrency error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Internal Error", "Failed to set currency.")] });
  }
}
