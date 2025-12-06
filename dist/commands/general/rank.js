"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rank = void 0;
const client_1 = require("@prisma/client");
const levelService_1 = require("../../services/levelService");
const imageService_1 = require("../../services/imageService");
const prisma = new client_1.PrismaClient();
const rank = async (client, message, args) => {
    const targetUser = message.mentions.users.first() || message.author;
    // Fetch user data
    const user = await prisma.user.findUnique({
        where: { discordId: targetUser.id },
    });
    if (!user) {
        return message.reply("User not found in database. They need to chat to gain XP first!");
    }
    const currentXp = user.xp;
    const currentLevel = user.level;
    const xpForNext = levelService_1.LevelService.getXpForNextLevel(currentLevel);
    // Get rank (position in leaderboard)
    const rankCount = await prisma.user.count({
        where: {
            OR: [
                { level: { gt: currentLevel } },
                { level: currentLevel, xp: { gt: currentXp } }
            ]
        }
    });
    const rankPosition = rankCount + 1;
    try {
        const attachment = await (0, imageService_1.generateRankCard)({
            username: targetUser.username,
            level: currentLevel,
            currentXp: currentXp,
            requiredXp: xpForNext,
            rank: rankPosition,
            avatarUrl: targetUser.displayAvatarURL({ extension: 'png', size: 256 })
        }, user.profileTheme || 'classic');
        message.reply({ files: [attachment] });
    }
    catch (error) {
        console.error("Rank Image Error:", error);
        message.reply("Failed to generate rank card.");
    }
};
exports.rank = rank;
//# sourceMappingURL=rank.js.map