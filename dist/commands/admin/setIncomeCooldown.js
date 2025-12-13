"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetIncomeCooldown = handleSetIncomeCooldown;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
const SUPPORTED = ["work", "beg", "crime", "slut"];
const permissionUtils_1 = require("../../utils/permissionUtils");
async function handleSetIncomeCooldown(message, args) {
    try {
        if (!message.member || !(await (0, permissionUtils_1.canExecuteAdminCommand)(message, message.member))) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Permission", "Admins or Bot Commanders only.")] });
        }
        const cmd = (args[0] ?? "").toLowerCase();
        const timeStr = args.slice(1).join(" ");
        const seconds = (0, format_1.parseDuration)(timeStr);
        if (!SUPPORTED.includes(cmd) || seconds === null || seconds < 0) {
            return message.reply({
                embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!setincomecooldown <work|beg|crime|slut> <duration>`\nExample: `!setincomecooldown work 1h 30m`")]
            });
        }
        await prisma_1.default.incomeConfig.upsert({
            where: { guildId_commandKey: { guildId: message.guildId, commandKey: cmd } },
            create: { guildId: message.guildId, commandKey: cmd, minPay: 10, maxPay: 50, cooldown: seconds, successPct: 100 },
            update: { cooldown: seconds }
        });
        return message.reply({
            embeds: [(0, embed_1.successEmbed)(message.author, "Cooldown Updated", `Set **${cmd}** cooldown to **${(0, format_1.formatDuration)(seconds * 1000)}**`)]
        });
    }
    catch (err) {
        console.error("handleSetIncomeCooldown error:", err);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Internal Error", "Failed to set cooldown.")] });
    }
}
//# sourceMappingURL=setIncomeCooldown.js.map