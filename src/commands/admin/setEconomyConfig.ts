
import { Message, EmbedBuilder } from "discord.js";
import { updateGuildConfig, getGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleSetEconomyConfig(message: Message, args: string[], type: "loan" | "fd" | "rd" | "tax") {
    if (!message.guild) return;

    // Check permissions (Admin only)
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [errorEmbed(message.author, "Permission Denied", "You need Administrator permissions to use this command.")] });
    }

    const valueStr = args[0];
    const value = parseInt(valueStr);

    if (isNaN(value) || value < 0 || value > 100) {
        return message.reply({ embeds: [errorEmbed(message.author, "Invalid Value", "Please provide a valid percentage between 0 and 100.")] });
    }

    let field = "";
    let name = "";

    switch (type) {
        case "loan":
            field = "loanInterestRate";
            name = "Loan Interest Rate";
            break;
        case "fd":
            field = "fdInterestRate";
            name = "Fixed Deposit (FD) Rate";
            break;
        case "rd":
            field = "rdInterestRate";
            name = "Recurring Deposit (RD) Rate";
            break;
        case "tax":
            field = "marketTax";
            name = "Black Market Tax";
            break;
    }

    await updateGuildConfig(message.guild.id, { [field]: value });

    return message.reply({
        embeds: [successEmbed(message.author, "Configuration Updated", `Successfully set **${name}** to **${value}%**.`)]
    });
}
