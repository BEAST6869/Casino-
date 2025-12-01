import prisma from "../utils/prisma";
import { GuildConfig } from "@prisma/client";

// Global Cache: Stores guild settings in memory
// Key = Guild ID, Value = Config Object
const configCache = new Map<string, GuildConfig>();

export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  // 1. FAST: Check if we have the config in memory
  if (configCache.has(guildId)) {
    return configCache.get(guildId)!;
  }

  // 2. SLOW: If not in memory, fetch from Database
  let cfg = await prisma.guildConfig.findUnique({ where: { guildId } });

  // 3. If it doesn't exist in DB, create a default one
  if (!cfg) {
    cfg = await prisma.guildConfig.create({
      data: { guildId }
    });
  }

  // 4. Save to Cache so the next request is instant
  configCache.set(guildId, cfg);

  return cfg;
}

export async function updateGuildConfig(guildId: string, data: any) {
  // 1. Update Database (So data is safe)
  const updated = await prisma.guildConfig.update({
    where: { guildId },
    data
  });

  // 2. Update Cache (So the bot knows about the change immediately)
  configCache.set(guildId, updated);

  return updated;
}