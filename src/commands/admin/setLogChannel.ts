
import { Message, PermissionsBitField, ChannelType } from "discord.js";
import { updateGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleSetLogChannel(message: Message, args: string[]) {
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "You need Administrator permissions.")] });
    }

    const channel = message.mentions.channels.first() || message.guild?.channels.cache.get(args[0]);

    if (!channel || channel.type !== ChannelType.GuildText) {
        return message.reply({
            embeds: [errorEmbed(message.author, "Invalid Channel", "Please mention a valid text channel or provide its ID.\nUsage: `!set-log-channel #logs`")]
        });
    }

    await updateGuildConfig(message.guildId!, {
        logChannelId: channel.id
    });

    return message.reply({
        embeds: [successEmbed(message.author, "Configuration Updated", `📝 Audit logs will now be sent to ${channel.toString()}.`)]
    });
}
