// src/utils/interactionHelpers.ts
import {
  Interaction,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  MessageComponentInteraction,
  ContextMenuCommandInteraction,
} from "discord.js";

/**
 * Safely reply to an interaction. Handles common interaction flavors.
 * - If ChatInputCommandInteraction => reply / followUp as appropriate
 * - If MessageComponentInteraction => reply / followUp
 * - If AutocompleteInteraction => uses respond (if choices provided)
 * - Otherwise tries generic reply if present
 */
export async function safeInteractionReply(interaction: Interaction, opts: { content: string; ephemeral?: boolean }) {
  const { content, ephemeral = true } = opts;

  try {
    if ((interaction as ChatInputCommandInteraction).isChatInputCommand?.()) {
      const ci = interaction as ChatInputCommandInteraction;
      if (ci.replied || ci.deferred) {
        return ci.followUp({ content, ephemeral });
      } else {
        return ci.reply({ content, ephemeral });
      }
    }

    if ((interaction as ContextMenuCommandInteraction).isContextMenuCommand?.()) {
      const cm = interaction as ContextMenuCommandInteraction;
      if (cm.replied || cm.deferred) return cm.followUp({ content, ephemeral });
      return cm.reply({ content, ephemeral });
    }

    if ((interaction as MessageComponentInteraction).isMessageComponent?.()) {
      const mc = interaction as MessageComponentInteraction;
      if (mc.replied || mc.deferred) return mc.followUp({ content, ephemeral });
      return mc.reply({ content, ephemeral });
    }

    // Autocomplete interactions must use respond(choices) — can't reply normally.
    if ((interaction as AutocompleteInteraction).isAutocomplete?.()) {
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
  } catch (err: any) {
    if (err.code === 10062) {
      // Unknown interaction - ignore, as it's too late to reply
      return;
    }
    console.error("safeInteractionReply failed:", err);
  }
}
