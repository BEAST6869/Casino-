import { Message, TextChannel } from "discord.js";
import { useItem } from "../../services/shopService";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleUse(message: Message, args: string[]) {
    if (!message.guild || !message.member) return;

    const itemName = args.join(" ");

    if (!itemName) {
        return message.reply({
            embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!use <item_name>`")]
        });
    }

    try {
        const { item, results } = await useItem(
            message.author.id,
            message.guildId!,
            itemName,
            message.member
        );

        const customMessages = results
            .filter(r => r.type === "CUSTOM_MESSAGE")
            .map(r => r.message);

        const otherEffects = results
            .filter(r => r.type !== "CUSTOM_MESSAGE")
            .map(r => r.message);

        // Send custom messages first (plain text)
        if (customMessages.length > 0) {
            await (message.channel as TextChannel).send(customMessages.join("\n"));
        }

        // Send the embed with remaining effects
        const embed = successEmbed(
            message.author,
            `Used: ${item.name}`,
            otherEffects.length > 0 ? otherEffects.join("\n") : "✨ Item used successfully!"
        );

        return message.reply({ embeds: [embed] });
    } catch (err: any) {
        return message.reply({
            embeds: [errorEmbed(message.author, "Error", err.message || "Failed to use item.")]
        });
    }
}
