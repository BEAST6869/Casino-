import { Message } from "discord.js";
import { updateGuildConfig, getGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { parseSmartAmount, fmtCurrency } from "../../utils/format";
import { canExecuteAdminCommand } from "../../utils/permissionUtils";

export async function handleSetStartMoney(message: Message, args: string[]) {
    if (!message.guild) return;
    if (!message.member || !(await canExecuteAdminCommand(message, message.member))) return;

    const amountStr = args[0];
    if (!amountStr) {
        const config = await getGuildConfig(message.guild.id);
        return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", `Usage: \`${config.prefix}set-start-money <amount>\``)] });
    }

    const amount = parseSmartAmount(amountStr);
    if (isNaN(amount) || amount < 0) {
        return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Please provide a valid number.")] });
    }

    await updateGuildConfig(message.guild.id, { startBalance: amount });
    return message.reply({ embeds: [successEmbed(message.author, "Start Money Updated", `New users will start with **${fmtCurrency(amount)}**.`)] });
}