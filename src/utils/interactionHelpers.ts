import {
  Interaction,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  MessageComponentInteraction,
  ContextMenuCommandInteraction,
} from "discord.js";

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

    if ((interaction as AutocompleteInteraction).isAutocomplete?.()) {
      console.warn("safeInteractionReply called for AutocompleteInteraction — no reply possible.");
      return;
    }

    if (interaction.isRepliable()) {
      return interaction.reply({ content, ephemeral });
    }
  } catch (err: any) {
    if (err.code === 10062) {
      return;
    }
    console.error("safeInteractionReply failed:", err);
  }
}