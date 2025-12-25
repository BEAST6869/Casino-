import { Message } from "discord.js";
import { updateGuildConfig, getGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { canExecuteAdminCommand } from "../../utils/permissionUtils";

export async function handleSetCurrency(message: Message, args: string[]) {
  try {
    if (!message.member || !(await canExecuteAdminCommand(message, message.member))) {
      return message.reply({ embeds: [errorEmbed(message.author, "No Permission", "Admins or Bot Commanders only.")] });
    }
    const name = args.join(" ").trim();
    if (!name) {
      const config = await getGuildConfig(message.guildId!);
      return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", `\`${config.prefix}setcurrency <name>\``)] });
    }
    await updateGuildConfig(message.guildId!, { currencyName: name });
    return message.reply({ embeds: [successEmbed(message.author, "Currency Updated", `Currency set to **${name}**`)] });
  } catch (err) {
    console.error("handleSetCurrency error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Internal Error", "Failed to set currency.")] });
  }
}