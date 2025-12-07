
import { Message, PermissionsBitField } from "discord.js";
import prisma from "../../utils/prisma";
import { errorEmbed, successEmbed } from "../../utils/embed";
import { logToChannel } from "../../utils/discordLogger";

export async function handleResetEconomy(message: Message, args: string[]) {
  try {
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply({ embeds: [errorEmbed(message.author, "No Permission", "Admins only.")] });
    }

    // require explicit confirm token
    const token = args[0]?.toLowerCase();
    if (token !== "confirm") {
      return message.reply({
        embeds: [errorEmbed(message.author, "Confirmation Required", "This will wipe wallets, banks, transactions and audits. Run `!reseteconomy confirm` to proceed.")]
      });
    }

    // perform destructive reset: set wallet/bank balances to 0, delete transactions and audits
    try {
      await prisma.$transaction([
        prisma.transaction.deleteMany({}),
        prisma.audit.deleteMany({}),
        prisma.wallet.updateMany({ data: { balance: 0 } }),
        prisma.bank.updateMany({ data: { balance: 0 } }),
        prisma.inventory.deleteMany({}),
        prisma.marketListing.deleteMany({})
      ]);

      // Log It
      await logToChannel(message.client, {
        guild: message.guild!,
        type: "ADMIN",
        title: "🔥 ECONOMY RESET 🔥",
        description: `**Admin:** ${message.author.tag} (${message.author.id})\n\nALL user data, wallets, banks, investments, and items were wiped.`,
        color: 0x000000
      });

      return message.reply({
        embeds: [successEmbed(message.author, "Economy Reset", "All wallets, banks, inventories & items zeroed; transactions & audits deleted.")]
      });
    } catch (innerErr) {
      console.error("Reset transaction failed:", innerErr);
      return message.reply({
        embeds: [errorEmbed(message.author, "Reset Failed", "Failed while resetting. Check server logs.")]
      });
    }
  } catch (err) {
    console.error("handleResetEconomy error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Internal Error", "Failed to reset economy.")] });
  }
}
