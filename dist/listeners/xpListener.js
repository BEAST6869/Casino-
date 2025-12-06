"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupXpListener = void 0;
const levelService_1 = require("../services/levelService");
const setupXpListener = (client) => {
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild)
            return;
        // Random XP between 15 and 25
        const xpAmount = Math.floor(Math.random() * 11) + 15;
        try {
            const result = await levelService_1.LevelService.addXp(message.author.id, message.guild.id, xpAmount);
            if (result && result.leveledUp) {
                if ('send' in message.channel) {
                    await message.channel.send(`🎉 **Level Up!** ${message.author.toString()} has reached **Level ${result.newLevel}**!`);
                }
            }
        }
        catch (error) {
            console.error("Error giving XP:", error);
        }
    });
};
exports.setupXpListener = setupXpListener;
//# sourceMappingURL=xpListener.js.map