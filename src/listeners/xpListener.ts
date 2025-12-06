import { Client, Message } from 'discord.js';
import { LevelService } from '../services/levelService';

export const setupXpListener = (client: Client) => {
    client.on('messageCreate', async (message: Message) => {
        if (message.author.bot || !message.guild) return;

        // Random XP between 15 and 25
        const xpAmount = Math.floor(Math.random() * 11) + 15;

        try {
            const result = await LevelService.addXp(message.author.id, message.guild.id, xpAmount);

            if (result && result.leveledUp) {
                if ('send' in message.channel) {
                    await (message.channel as any).send(`🎉 **Level Up!** ${message.author.toString()} has reached **Level ${result.newLevel}**!`);
                }
            }
        } catch (error) {
            console.error("Error giving XP:", error);
        }
    });
};
