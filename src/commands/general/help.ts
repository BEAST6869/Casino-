// src/commands/general/help.ts
import { Message } from "discord.js";
import { infoEmbed } from "../../utils/embed";

export async function handleHelp(message: Message) {
  const isAdmin = message.member?.permissions.has("Administrator");

  const userEmbed = infoEmbed(
    message.author,
    "Casino Bot Help",
    `
Here are the commands you can use:

**💰 Economy Commands**
\`!bal\` — Show wallet & bank  
\`!dep <amount|all>\` — Deposit money into bank  
\`!with <amount|all>\` — Withdraw money  
\`!transfer <amount> @user\` — Transfer money  
\`!work\`, \`!beg\`, \`!crime\`, \`!slut\` — Earn coins (cooldowns apply)

**🎲 Games**
\`!bet <amount> <color/number>\` — Roulette  
(More games coming soon)

${isAdmin ? `\n**🛠 Admin Commands**\n(You are an admin — you can use these)**\n\`!addmoney @user <amount>\`\n\`!setstartmoney <amount>\`\n\`!setincomecooldown <cmd> <seconds>\`\n\`!setcurrency <name>\`\n\`!reseteconomy confirm\`\n\`!adminviewconfig\`` : ""}
`
  );

  return message.reply({ embeds: [userEmbed] });
}
