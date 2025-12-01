"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetIncomeCooldown = handleSetIncomeCooldown;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const embed_1 = require("../../utils/embed");
const SUPPORTED = ["work", "beg", "crime", "slut"];
async function handleSetIncomeCooldown(message, args) {
    try {
        if (!message.member?.permissions.has("Administrator")) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Permission", "Admins only.")] });
        }
        const cmd = (args[0] ?? "").toLowerCase();
        const seconds = Math.floor(Number(args[1] ?? NaN));
        if (!SUPPORTED.includes(cmd) || !Number.isFinite(seconds) || seconds < 0) {
            return message.reply({
                embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!setincomecooldown <work|beg|crime|slut> <seconds>`")]
            });
        }
        await prisma_1.default.incomeConfig.upsert({
            where: { guildId_commandKey: { guildId: message.guildId, commandKey: cmd } },
            create: { guildId: message.guildId, commandKey: cmd, minPay: 10, maxPay: 50, cooldown: seconds, successPct: 100 },
            update: { cooldown: seconds }
        });
        return message.reply({
            embeds: [(0, embed_1.successEmbed)(message.author, "Cooldown Updated", `Set **${cmd}** cooldown to **${seconds}s**`)]
        });
    }
    catch (err) {
        console.error("handleSetIncomeCooldown error:", err);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Internal Error", "Failed to set cooldown.")] });
    }
}
//# sourceMappingURL=setIncomeCooldown.js.map