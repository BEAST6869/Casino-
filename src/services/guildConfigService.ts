import prisma from "../utils/prisma";

export async function getGuildConfig(guildId: string) {
  const cfg = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (cfg) return cfg;

  // First use → create default config
  return prisma.guildConfig.create({
    data: { guildId }
  });
}

export async function updateGuildConfig(guildId: string, data: any) {
  await getGuildConfig(guildId);
  return prisma.guildConfig.update({
    where: { guildId },
    data
  });
}
