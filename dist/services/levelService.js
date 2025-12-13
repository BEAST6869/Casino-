"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const COOLDOWN_SECONDS = 60;
const xpCooldowns = new Map();
class LevelService {
    static calculateLevel(xp) {
        let level = 0;
        let xpForNext = 100;
        return level;
    }
    static getXpForNextLevel(level) {
        return 5 * (level * level) + 50 * level + 100;
    }
    static async addXp(userId, guildId, amount) {
        const now = Date.now();
        const key = `${userId}-${guildId}`;
        const lastXp = xpCooldowns.get(key) || 0;
        if (now - lastXp < COOLDOWN_SECONDS * 1000) {
            return null;
        }
        xpCooldowns.set(key, now);
        let user = await prisma.user.findUnique({
            where: { discordId_guildId: { discordId: userId, guildId } },
        });
        if (!user) {
            return;
        }
        let newXp = user.xp + amount;
        let newLevel = user.level;
        let leveledUp = false;
        let requiredXp = this.getXpForNextLevel(newLevel);
        while (newXp >= requiredXp) {
            newXp -= requiredXp;
            newXp -= requiredXp;
            newLevel++;
            leveledUp = true;
            requiredXp = this.getXpForNextLevel(newLevel);
        }
        const updatedUser = await prisma.user.update({
            where: { discordId_guildId: { discordId: userId, guildId } },
            data: {
                xp: newXp,
                level: newLevel,
            },
        });
        return { leveledUp, newLevel, user: updatedUser };
    }
}
exports.LevelService = LevelService;
//# sourceMappingURL=levelService.js.map