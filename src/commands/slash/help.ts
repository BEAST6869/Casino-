// src/commands/slash/help.ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { infoEmbed } from "../../utils/embed";


export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Shows all available commands for this casino bot.");

export async function execute(interaction: ChatInputCommandInteraction) {
  const isAdmin = interaction.memberPermissions?.has("Administrator") ?? false;

  const description = `
**💰 Economy Commands**
/bal — Show wallet & bank  
/dep <amount|all> — Deposit money  
/with <amount|all> — Withdraw money  
/transfer <amount> <user> — Transfer money  
/work /beg /crime /slut — Earn coins

**🎲 Games**
/bet — Roulette  

${isAdmin ? `
**🛠 Admin Commands**
!addmoney @user <amount>  
!setstartmoney <amount>  
!setincomecooldown <cmd> <seconds>  
!setcurrency <name>  
!reseteconomy confirm  
!adminviewconfig  
` : ""}
`;

  return interaction.reply({
    embeds: [infoEmbed(interaction.user, "Casino Bot — Slash Help", description)],
    ephemeral: true
  });
}
