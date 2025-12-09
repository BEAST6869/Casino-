// src/commands/admin/setStartMoney.ts
import { Message } from "discord.js";
import { updateGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { parseSmartAmount, fmtCurrency } from "../../utils/format";

export async function handleSetStartMoney(message: Message, args: string[]) {
    if (!message.guild) return;
    if (!message.member?.permissions.has("Administrator")) return;

    const amountStr = args[0];
    if (!amountStr) {
        return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!set - start - money <amount>`")] });
    }

    const amount = parseSmartAmount(amountStr);

    if (isNaN(amount) || amount < 0) {
        return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Please provide a valid number.")] });
    }

    await updateGuildConfig(message.guild.id, { startBalance: amount });
    return message.reply({ embeds: [successEmbed(message.author, "Start Money Updated", `New users will start with ** ${fmtCurrency(amount)}**.`)] });
}