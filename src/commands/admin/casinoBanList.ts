import { Message, EmbedBuilder } from "discord.js";
import prisma from "../../utils/prisma";
import { errorEmbed } from "../../utils/embed";

export async function handleCasinoBanList(message: Message, args: string[]) {
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [errorEmbed(message.author, "No Permission", "Administrator required.")] });
    }

    try {
        const bannedUsers = await prisma.user.findMany({
            where: { isBanned: true },
            select: { discordId: true, username: true } // Fetch specific fields
        });

        if (bannedUsers.length === 0) {
            return message.reply({
                embeds: [new EmbedBuilder().setColor("#00ff00").setTitle("Casino Ban List").setDescription("No users are currently banned.")]
            });
        }

        const description = bannedUsers
            .map((u, i) => `${i + 1}. <@${u.discordId}>`)
            .join("\n");

        const embed = new EmbedBuilder()
            .setColor("#ff0000")
            .setTitle(`Casino Ban List (${bannedUsers.length})`)
            .setDescription(description)
            .setFooter({ text: `Requested by ${message.author.tag}` });

        return message.reply({ embeds: [embed] });

    } catch (error) {
        console.error(error);
        return message.reply({ embeds: [errorEmbed(message.author, "Error", "Failed to fetch ban list.")] });
    }
}
