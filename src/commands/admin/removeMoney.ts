  import { Message } from "discord.js";
  import { ensureUserAndWallet, removeMoneyFromWallet } from "../../services/walletService";
  import { removeMoneyFromBank } from "../../services/bankService";
  import { successEmbed, errorEmbed } from "../../utils/embed";
  import { fmtCurrency } from "../../utils/format";
  import { getGuildConfig } from "../../services/guildConfigService";

  export async function handleRemoveMoney(message: Message, args: string[]) {
    // 1. Permission Check
    if (!message.member?.permissions.has("Administrator")) {
      return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "Admins only.")] });
    }

    // Usage: !removemoney <user> <amount> [wallet/bank]
    const targetUser = message.mentions.users.first();
    const rawAmount = args[1]; // args[0] is user mention usually
    
    if (!targetUser || !rawAmount) {
      return message.reply({ 
        embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!removemoney @user <amount> [wallet/bank]`")] 
      });
    }

    // Handle commas: "1,000" -> "1000"
    const cleanAmount = rawAmount.replace(/,/g, "");
    const amount = parseInt(cleanAmount);

    if (isNaN(amount) || amount <= 0) {
      return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Please provide a valid positive number.")] });
    }

    const type = args[2]?.toLowerCase() === "bank" ? "bank" : "wallet";

    try {
      const user = await ensureUserAndWallet(targetUser.id, targetUser.tag);
      const config = await getGuildConfig(message.guildId!);
      const emoji = config.currencyEmoji;

      if (type === "bank") {
        await removeMoneyFromBank(user.id, amount);
        return message.reply({ 
          embeds: [successEmbed(message.author, "Money Removed", `Removed **${fmtCurrency(amount, emoji)}** from ${targetUser.username}'s **Bank**.`)] 
        });
      } else {
        await removeMoneyFromWallet(user.wallet!.id, amount);
        return message.reply({ 
          embeds: [successEmbed(message.author, "Money Removed", `Removed **${fmtCurrency(amount, emoji)}** from ${targetUser.username}'s **Wallet**.`)] 
        });
      }

    } catch (err) {
      return message.reply({ embeds: [errorEmbed(message.author, "Error", (err as Error).message)] });
    }
  }