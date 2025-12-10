import { Message, EmbedBuilder } from "discord.js";
import { parseDuration, parseSmartAmount } from "../../utils/format";
import { updateGuildConfig, getGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleSetEconomyConfig(message: Message, args: string[], type: "loan" | "fd" | "rd" | "tax" | "credit-reward" | "credit-penalty" | "credit-cap" | "min-credit-cap" | "max-loans" | "toggle-ask" | "bank-limit" | "wallet-limit") {
    if (!message.guild) return;

    // Check permissions (Admin only)
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [errorEmbed(message.author, "Permission Denied", "You need Administrator permissions to use this command.")] });
    }

    const valueStr = args[0];
    const value = parseSmartAmount(valueStr); // Supports 1k, 1m, etc.

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
        case "min-credit-cap":
            field = "minCreditScore";
            name = "Min Credit Score Cap";
            suffix = " pts";
            break;
        case "max-loans":
            if (value < 1) return message.reply({ embeds: [errorEmbed(message.author, "Invalid Limit", "Max active loans must be at least 1.")] });
            field = "maxActiveLoans";
            name = "Max Active Loans";
            suffix = "";
            break;
        case "bank-limit":
            field = "bankLimit";
            name = "Bank Capacity Limit";
            suffix = "";
            break;
        case "wallet-limit":
            field = "walletLimit";
            name = "Wallet Capacity Limit";
            suffix = "";
            break;
        case "toggle-ask":
            // Special handling for boolean toggle. 
            // We interpret value > 0 as true, 0 as false? Or just toggle?
            // User requested "enable/disable". args[0] might be "on"/"off".
            // But this function expects an int parse at the top. 
            // I should modify the top parsing or just accept 1/0.
            // Let's stick to 1=Enabled, 0=Disabled for simplicity within this function structure.
            field = "enableAskCommand";
            name = "Ask Command Status";
            suffix = value > 0 ? "Enabled" : "Disabled";
            // We need to cast value to boolean for the DB update
            await updateGuildConfig(message.guild.id, { [field]: value > 0 });
            return message.reply({
                embeds: [successEmbed(message.author, "Configuration Updated", `Successfully set **Ask Command** to **${value > 0 ? "Enabled" : "Disabled"}**.`)]
            });
    }

    await updateGuildConfig(message.guild.id, { [field]: value });

    return message.reply({
        embeds: [successEmbed(message.author, "Configuration Updated", `Successfully set **${name}** to **${value}${suffix}**.`)]
    });
}
