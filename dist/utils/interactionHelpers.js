"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeInteractionReply = safeInteractionReply;
async function safeInteractionReply(interaction, opts) {
    const { content, ephemeral = true } = opts;
    try {
        if (interaction.isChatInputCommand?.()) {
            const ci = interaction;
            if (ci.replied || ci.deferred) {
                return ci.followUp({ content, ephemeral });
            }
            else {
                return ci.reply({ content, ephemeral });
            }
        }
        if (interaction.isContextMenuCommand?.()) {
            const cm = interaction;
            if (cm.replied || cm.deferred)
                return cm.followUp({ content, ephemeral });
            return cm.reply({ content, ephemeral });
        }
        if (interaction.isMessageComponent?.()) {
            const mc = interaction;
            if (mc.replied || mc.deferred)
                return mc.followUp({ content, ephemeral });
            return mc.reply({ content, ephemeral });
        }
        if (interaction.isAutocomplete?.()) {
            console.warn("safeInteractionReply called for AutocompleteInteraction — no reply possible.");
            return;
        }
        if (interaction.isRepliable()) {
            return interaction.reply({ content, ephemeral });
        }
    }
    catch (err) {
        if (err.code === 10062) {
            return;
        }
        console.error("safeInteractionReply failed:", err);
    }
}
//# sourceMappingURL=interactionHelpers.js.map