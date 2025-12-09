import { Interaction, EmbedBuilder } from "discord.js";
import { transferMoney } from "../services/walletService";
import { logToChannel } from "../utils/discordLogger";

export async function handleAskInteraction(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;

    const [action, requesterId, amountStr] = interaction.customId.split(":");

    // Security check: Only the user mentioned in the message text can click
    const mentionMatch = interaction.message.content.match(/<@!?(\d+)>/);
    const targetUserId = mentionMatch ? mentionMatch[1] : null;

    if (!targetUserId || interaction.user.id !== targetUserId) {
        return interaction.reply({ content: "🚫 This request is not for you.", ephemeral: true });
    }

    try {
        // Defer update immediately to prevent "Unknown interaction" timeout errors
        await interaction.deferUpdate();

        if (action === "ask_decline") {
            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor(0xFF0000)
                .setFooter({ text: `Declined by ${interaction.user.username}` });

            await interaction.editReply({ components: [], embeds: [embed] });

            await logToChannel(interaction.client, {
                guild: interaction.guild!,
                type: "ECONOMY",
                title: "Money Request Declined",
                description: `**From:** <@${requesterId}>\n**To:** ${interaction.user.tag}\n**Amount:** ${amountStr}\n**Status:** Declined`,
                color: 0xFF0000
            });
            return;
        }

        if (action === "ask_accept") {
            const amount = parseInt(amountStr);

            try {
                // Perform the transfer
                await transferMoney(interaction.user.id, requesterId, amount, interaction.guildId!);

                const embed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor(0x00FF00)
                    .setFooter({ text: `Accepted by ${interaction.user.username} • Transfer Complete` });

                await interaction.editReply({ components: [], embeds: [embed] });

                await logToChannel(interaction.client, {
                    guild: interaction.guild!,
                    type: "ECONOMY",
                    title: "Money Request Accepted",
                    description: `**From:** <@${requesterId}>\n**To:** ${interaction.user.tag}\n**Amount:** ${amount}\n**Status:** Accepted & Transferred`,
                    color: 0x00FF00
                });
            } catch (error: any) {
                // If transfer fails, we can't use reply() because we already deferred.
                // We use followUp() to send a new ephemeral error message.
                if (error.message === "Insufficient funds.") {
                    return interaction.followUp({ content: "❌ You do not have enough funds in your **wallet** to fulfill this request.", ephemeral: true });
                }
                return interaction.followUp({ content: `❌ Transfer failed: ${error.message}`, ephemeral: true });
            }
        }
    } catch (err) {
        console.error("Ask interaction error:", err);
        // If defer failed or something else, let it bubble or safeReply will handle it 
        // (safeReply is now updated to ignore 10062 errors)
    }
}
