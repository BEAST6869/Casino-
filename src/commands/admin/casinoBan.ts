import { Message } from "discord.js";
import prisma from "../../utils/prisma";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleCasinoBan(message: Message, args: string[]) {
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [errorEmbed(message.author, "No Permission", "Administrator required.")] });
    }

    const mention = args[0];
    const reason = args.slice(1).join(" ") || "No reason provided.";

    if (!mention) {
        return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!casinoban @user <reason>`")] });
    }

    const discordId = mention.replace(/[<@!>]/g, "");

    try {
        const user = await prisma.user.upsert({
            where: { discordId },
            create: { discordId, username: "Unknown", isBanned: true },
            update: { isBanned: true }
        });

        return message.reply({
            embeds: [successEmbed(message.author, "User Banned", `🚫 **<@${discordId}>** has been banned from the casino.\nReason: ${reason}`)]
        });
    } catch (error) {
        console.error(error);
        return message.reply({ embeds: [errorEmbed(message.author, "Error", "Failed to ban user.")] });
    }
}
