// src/services/guildConfigService.ts
import prisma from "../utils/prisma";

export type GuildConfigRow = {
  guildId: string;
  currencyName?: string;
  startMoney?: number;
  prefix?: string;
  economyEmojiId?: string | null;
  economyEmojiName?: string | null;
  // ...other fields if you want
};

export async function getGuildConfig(guildId: string) {
  let cfg = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (cfg) return cfg;
  // create default
  cfg = await prisma.guildConfig.create({ data: { guildId } });
  return cfg;
}

export async function updateGuildConfig(guildId: string, data: Partial<GuildConfigRow>) {
  await getGuildConfig(guildId); // ensure exists
  return prisma.guildConfig.update({
    where: { guildId },
    data
  });
}
