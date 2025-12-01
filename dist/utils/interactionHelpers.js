"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeInteractionReply = safeInteractionReply;
/**
 * Safely reply to an interaction. Handles common interaction flavors.
 * - If ChatInputCommandInteraction => reply / followUp as appropriate
 * - If MessageComponentInteraction => reply / followUp
 * - If AutocompleteInteraction => uses respond (if choices provided)
 * - Otherwise tries generic reply if present
 */
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
        // Autocomplete interactions must use respond(choices) — can't reply normally.
        if (interaction.isAutocomplete?.()) {
            // fallback: send ephemeral message to user via follow-up on the originating command is not possible here.
            // Best we can do is ignore or log. We'll attempt a no-op.
            console.warn("safeInteractionReply called for AutocompleteInteraction — no reply possible.");
            return;
        }
        // generic fallback (some Interaction types expose reply)
        // @ts-ignore
        if (typeof interaction.reply === "function") {
            // @ts-ignore
            return interaction.reply({ content, ephemeral });
        }
    }
    catch (err) {
        console.error("safeInteractionReply failed:", err);
    }
}
//# sourceMappingURL=interactionHelpers.js.map