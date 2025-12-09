import { Message, PermissionsBitField } from "discord.js";
import prisma from "../../utils/prisma";
import { ensureUserAndWallet } from "../../services/walletService";
import { ensureBankForUser } from "../../services/bankService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { fmtCurrency, parseSmartAmount } from "../../utils/format";
import { logToChannel } from "../../utils/discordLogger";
import { getGuildConfig } from "../../services/guildConfigService";

export async function handleAddMoney(message: Message, args: string[]) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "You need Administrator permissions.")] });
  }

  const mention = args[0];
  const amountStr = args[1]; // Keep amountStr for the original error message if needed, though it's replaced by parseSmartAmount

  // Arg[0] = target, Arg[1] = amount
  const targetId = args[0].replace(/[<@!>]/g, "");
  const amount = parseSmartAmount(args[1]); // Default max is Infinity

  // Parse optional type argument (default to wallet)
  // Logic: check args[2] if it exists
  const typeArg = args[2]?.toLowerCase();
  const targetType = typeArg === "bank" ? "bank" : "wallet"; // Default wallet

  if (isNaN(amount) || amount <= 0) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Usage: `!add-money @user <amount> [wallet/bank]`")] });
  }

  const discordId = mention.replace(/[<@!>]/g, "");
  // Ensure user exists first
  const target = await ensureUserAndWallet(discordId, "Unknown");
  const config = await getGuildConfig(message.guildId!);
  const emoji = config.currencyEmoji;

  // We need to fetch the target user's ID for log details if not available on 'target' object (it is available as target.discordId or target.id)

  if (targetType === "bank") {
    // BANK ADDITION
    const bank = await ensureBankForUser(target.id);

    // We need walletId for the transaction entry even if it's a bank, 
    // though for strict correctness we might want a bank-specific transaction log or link to wallet ID.
    // The schema links transactions to Wallet. So we link it to the user's wallet ID.

    const [_, updatedBank] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          walletId: target.wallet!.id,
          amount,
          type: "admin_add_bank",
          meta: { by: message.author.id },
          isEarned: false
        }
      }),
      prisma.bank.update({
        where: { id: bank.id },
        data: { balance: { increment: amount } }
      }),
      prisma.audit.create({
        data: {
          guildId: message.guildId ?? undefined,
          userId: target.id,
          type: "admin_add",
          meta: { amount, target: "bank", by: message.author.id }
        }
      })
    ]);

    // Log It
    await logToChannel(message.client, {
      guild: message.guild!,
      type: "ADMIN",
      title: "Money Added (Bank)",
      description: `**Admin:** ${message.author.tag} (${message.author.id})\n**Target:** <@${target.discordId}>\n**Amount:** +${fmtCurrency(amount, emoji)}\n**New Bank Balance:** ${fmtCurrency(updatedBank.balance, emoji)}`,
      color: 0x00FF00
    });

    return message.reply({
      embeds: [successEmbed(message.author, "Money Added", `Added **${fmtCurrency(amount, emoji)}** to ${mention}'s **Bank**.\nNew Balance: **${fmtCurrency(updatedBank.balance, emoji)}**`)]
    });

  } else {
    // WALLET ADDITION (Default)
    const [_, updatedWallet] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          walletId: target.wallet!.id,
          amount,
          type: "admin_add",
          meta: { by: message.author.id },
          isEarned: false
        }
      }),
      prisma.wallet.update({
        where: { id: target.wallet!.id },
        data: { balance: { increment: amount } }
      }),
      prisma.audit.create({
        data: {
          guildId: message.guildId ?? undefined,
          userId: target.id, // ObjectId
          type: "admin_add",
          meta: { amount, target: "wallet", by: message.author.id }
        }
      })
    ]);

    if (updatedWallet) {
      // Log It
      await logToChannel(message.client, {
        guild: message.guild!,
        type: "ADMIN",
        title: "Money Added (Wallet)",
        description: `**Admin:** ${message.author.tag} (${message.author.id})\n**Target:** <@${target.discordId}>\n**Amount:** +${fmtCurrency(amount, emoji)}\n**New Wallet Balance:** ${fmtCurrency(updatedWallet.balance, emoji)}`,
        color: 0x00FF00
      });

      return message.reply({
        embeds: [successEmbed(message.author, "Money Added", `Added **${fmtCurrency(amount, emoji)}** to ${mention}'s **Wallet**.\nNew Balance: **${fmtCurrency(updatedWallet.balance, emoji)}**`)]
      });
    }
  }
}