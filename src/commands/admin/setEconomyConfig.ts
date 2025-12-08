import { Message, EmbedBuilder } from "discord.js";
import { updateGuildConfig, getGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleSetEconomyConfig(message: Message, args: string[], type: "loan" | "fd" | "rd" | "tax" | "credit-reward" | "credit-penalty" | "credit-cap" | "max-loans") {
    if (!message.guild) return;

    // Check permissions (Admin only)
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [errorEmbed(message.author, "Permission Denied", "You need Administrator permissions to use this command.")] });
    }

    const valueStr = args[0];
    const value = parseInt(valueStr);

    if (isNaN(value) || value < 0) {
        return message.reply({ embeds: [errorEmbed(message.author, "Invalid Value", "Please provide a valid positive number.")] });
    }

    let field = "";
    let name = "";
    let suffix = "";

    switch (type) {
        case "loan":
            field = "loanInterestRate";
            name = "Loan Interest Rate";
            suffix = "%";
            break;
        case "fd":
            field = "fdInterestRate";
            name = "Fixed Deposit (FD) Rate";
            suffix = "%";
            break;
        case "rd":
            field = "rdInterestRate";
            name = "Recurring Deposit (RD) Rate";
            suffix = "%";
            break;
        case "tax":
            field = "marketTax";
            name = "Black Market Tax";
            suffix = "%";
            break;
        case "credit-reward":
            field = "creditScoreReward";
            name = "Credit Score Reward (On-Time repayment)";
            suffix = " pts";
            break;
        case "credit-penalty":
            field = "creditScorePenalty";
            name = "Credit Score Penalty (Late repayment)";
            suffix = " pts";
            break;
        case "credit-cap":
            field = "maxCreditScore";
            name = "Max Credit Score Cap";
            suffix = " pts";
            break;
        case "max-loans":
            if (value < 1) return message.reply({ embeds: [errorEmbed(message.author, "Invalid Limit", "Max active loans must be at least 1.")] });
            field = "maxActiveLoans";
            name = "Max Active Loans";
            suffix = "";
            break;
    }

    await updateGuildConfig(message.guild.id, { [field]: value });

    return message.reply({
        embeds: [successEmbed(message.author, "Configuration Updated", `Successfully set **${name}** to **${value}${suffix}**.`)]
    });
}
