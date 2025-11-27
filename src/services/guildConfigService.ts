// src/services/guildConfigService.ts
import prisma from "../utils/prisma";

export async function getGuildConfig(guildId: string) {
  const cfg = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (cfg) return cfg;

  // Create default config
  return prisma.guildConfig.create({
    data: { guildId }
  });
}

export async function updateGuildConfig(guildId: string, data: any) {
  await getGuildConfig(guildId); // ensure exists
  return prisma.guildConfig.update({
    where: { guildId },
    data
  });
}
