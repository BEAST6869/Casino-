"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const embed_1 = require("../../utils/embed");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows all available commands for this casino bot.");
async function execute(interaction) {
    const isAdmin = interaction.memberPermissions?.has("Administrator") ?? false;
    const description = `**💰 Economy Commands**/bal — Show wallet & bank  /dep <amount|all> — Deposit money  /with <amount|all> — Withdraw money  /transfer <amount> <user> — Transfer money  /work /beg /crime /slut — Earn coins**🎲 Games**/bet — Roulette  ${isAdmin ? `**🛠 Admin Commands**!addmoney @user <amount>  !setstartmoney <amount>  !setincomecooldown <cmd> <seconds>  !setcurrency <name>  !reseteconomy confirm  !adminviewconfig  ` : ""}`;
    return interaction.reply({
        embeds: [(0, embed_1.infoEmbed)(interaction.user, "Casino Bot — Slash Help", description)],
        ephemeral: true
    });
}
//# sourceMappingURL=help.js.map