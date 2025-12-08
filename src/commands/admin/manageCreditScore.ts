import { Message, PermissionsBitField } from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { logToChannel } from "../../utils/discordLogger";
import { getGuildConfig } from "../../services/guildConfigService";
import prisma from "../../utils/prisma";

export async function handleSetCreditScore(message: Message, args: string[]) {
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "Admins only.")] });
    }

    // Check for "all" argument first
    if (args[0]?.toLowerCase() === "all" || args[0]?.toLowerCase() === "everyone") {
        const amountArg = args[1];
        if (!amountArg) {
            return message.reply({
                embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!set-credit-score all <amount>`\nExample: `!set-credit-score all 500`")]
            });
        }

        const amount = parseInt(amountArg);
        if (isNaN(amount) || amount < 0 || amount > 5000) {
            return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Score must be between 0 and 5000.")] });
        }

        // Bulk Update
        const result = await prisma.user.updateMany({
            data: { creditScore: amount }
        });

        // Log it
        await logToChannel(message.client, {
            guild: message.guild!,
            type: "ADMIN",
            title: "Bulk Credit Score Set",
            description: `**Admin:** ${message.author.tag}\n**Scope:** ALL USERS\n**New Score:** ${amount}\n**Affected:** ${result.count} users`,
            color: 0xFF4500 // Red-Orange
        });

        return message.reply({
            embeds: [successEmbed(message.author, "Bulk Update Complete", `Set credit score to **${amount}** for **${result.count}** users.`)]
        });
    }

    // Existing Single User Logic
    const targetUser = message.mentions.users.first();

    // Use last arg as amount usually, or find the number
    const amountArg = args.find(a => !a.startsWith("<@") && !isNaN(parseInt(a)));

    if (!targetUser || !amountArg) {
        return message.reply({
            embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!set-credit-score @user <amount>` or `!set-credit-score all <amount>`")]
        });
    }

    const amount = parseInt(amountArg);
    if (isNaN(amount) || amount < 0 || amount > 5000) return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Score must be between 0 and 5000.")] });

    // Update DB - SET instead of increment
    const user = await ensureUserAndWallet(targetUser.id, targetUser.tag);

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { creditScore: amount }
    });

    const config = await getGuildConfig(message.guildId!);

    await logToChannel(message.client, {
        guild: message.guild!,
        type: "ADMIN",
        title: "Credit Score Set",
        description: `**Admin:** ${message.author.tag}\n**User:** ${targetUser.tag}\n**Old Score:** ${user.creditScore}\n**New Score:** ${updatedUser.creditScore}`,
        color: 0xFFA500
    });

    return message.reply({
        embeds: [successEmbed(message.author, "Credit Score Updated", `Set ${targetUser.username}'s credit score to **${updatedUser.creditScore}**.`)]
    });
}
