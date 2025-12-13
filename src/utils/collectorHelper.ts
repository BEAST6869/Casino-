import { Message, Collection } from "discord.js";

// Helper to get message collector from guild text channels (avoids TS errors)
export function createTextCollector(
    message: Message,
    filter: (m: Message) => boolean,
    options: { time?: number; max?: number } = {}
) {
    // @ts-ignore - Guild text channels always have createMessageCollector
    return message.channel.createMessageCollector({ filter, ...options });
}
