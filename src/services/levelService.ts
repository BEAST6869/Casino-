import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const COOLDOWN_SECONDS = 60;
const xpCooldowns = new Map<string, number>();

export class LevelService {

    static calculateLevel(xp: number): number {
        // Inverse of 5 * L^2 + 50 * L + 100
        // Approximation or iterative approach 
        // For simplicity, let's just stick to checking if current XP > required for next level
        // Formula: XP = 5*L^2 + 50*L + 100 is "Total XP for Level L"? 
        // Usually formulas are "XP needed for NEXT level".
        // Let's use: Total XP to reach level L = 5*L^2 + 50*L + 100 
        // But simpler: Level = 0.1 * sqrt(XP) or similar.
        // Let's stick to the plan: Required XP for next level = 5*(currentLevel^2) + 50*currentLevel + 100
        // But we need to know the CURRENT level based on total XP.

        let level = 0;
        let xpForNext = 100; // Base requirement for level 1

        // This is inefficient for high levels but fine for now. 
        // Better: Store level and xp separately in DB, which we did.

        return level;
    }

    static getXpForNextLevel(level: number): number {
        return 5 * (level * level) + 50 * level + 100;
    }

    static async addXp(userId: string, guildId: string, amount: number) {
        // 1. Check Cooldown
        const now = Date.now();
        const lastXp = xpCooldowns.get(userId) || 0;
        if (now - lastXp < COOLDOWN_SECONDS * 1000) {
            return null; // On cooldown
        }
        xpCooldowns.set(userId, now);

        // 2. Get User
        let user = await prisma.user.findUnique({
            where: { discordId: userId },
        });

        if (!user) {
            // Should exist if they are chatting, but just in case
            return;
        }

        // 3. Add XP
        let newXp = user.xp + amount;
        let newLevel = user.level;
        let leveledUp = false;

        let requiredXp = this.getXpForNextLevel(newLevel);

        // While loop for multiple level ups (rare but possible)
        while (newXp >= requiredXp) {
            newXp -= requiredXp; // Reset XP for next level?? 
            // WAIT. Implementation Plan didn't specify strict "Cumulative" vs "Reset" XP.
            // Usually "Total XP" is monotonic increasing. 
            // "Current XP" bar resets.
            // Let's assume the DB stores TOTAL LIFETIME XP? Or XP towards next level?
            // "xp" in DB usually means Total. 
            // If DB 'xp' is total, then we compare newXp (total) vs (cumulative required).

            // Let's switch to a simpler model for the MVP:
            // "xp" in DB is "Current Progress XP". 
            // When you level up, "xp" resets to 0 (or overflow), and "level" increments.
            // This is easier to visualize: "XP: 50 / 150".

            newXp -= requiredXp;
            newLevel++;
            leveledUp = true;
            requiredXp = this.getXpForNextLevel(newLevel);
        }

        // 4. Update DB
        const updatedUser = await prisma.user.update({
            where: { discordId: userId },
            data: {
                xp: newXp,
                level: newLevel,
            },
        });

        return { leveledUp, newLevel, user: updatedUser };
    }
}
