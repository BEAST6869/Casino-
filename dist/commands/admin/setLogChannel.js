"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetLogChannel = handleSetLogChannel;
const discord_js_1 = require("discord.js");
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const permissionUtils_1 = require("../../utils/permissionUtils");
async function handleSetLogChannel(message, args) {
    if (!message.member || !(await (0, permissionUtils_1.canExecuteAdminCommand)(message, message.member))) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "You need Administrator or Bot Commander permissions.")] });
    }
    const channel = message.mentions.channels.first() || message.guild?.channels.cache.get(args[0]);
    if (!channel || channel.type !== discord_js_1.ChannelType.GuildText) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Channel", "Please mention a valid text channel or provide its ID.\nUsage: `!set-log-channel #logs`")]
        });
    }
    await (0, guildConfigService_1.updateGuildConfig)(message.guildId, {
        logChannelId: channel.id
    });
    return message.reply({
        embeds: [(0, embed_1.successEmbed)(message.author, "Configuration Updated", `📝 Audit logs will now be sent to ${channel.toString()}.`)]
    });
}
//# sourceMappingURL=setLogChannel.js.map