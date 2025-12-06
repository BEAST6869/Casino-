import { Message } from "discord.js";
import prisma from "../../utils/prisma";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleCasinoUnban(message: Message, args: string[]) {
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [errorEmbed(message.author, "No Permission", "Administrator required.")] });
    }

    const mention = args[0];

    if (!mention) {
        return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!casinounban @user`")] });
    }

    const discordId = mention.replace(/[<@!>]/g, "");

    try {
        const user = await prisma.user.update({
            where: { discordId },
            data: { isBanned: false }
        });

        return message.reply({
            embeds: [successEmbed(message.author, "User Unbanned", `✅ **<@${discordId}>** has been unbanned from the casino.`)]
        });
    } catch (error) {
        console.error(error);
        return message.reply({ embeds: [errorEmbed(message.author, "Error", "Failed to unban user (maybe they aren't in the DB?).")] });
    }
}
