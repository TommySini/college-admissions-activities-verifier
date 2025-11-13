import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Initialize default colors if they don't exist
  await prisma.settings.upsert({
    where: { key: "color_primary" },
    update: {},
    create: { key: "color_primary", value: "#7d95b9" },
  });

  await prisma.settings.upsert({
    where: { key: "color_tertiary" },
    update: {},
    create: { key: "color_tertiary", value: "#a4c4e0" },
  });

  await prisma.settings.upsert({
    where: { key: "color_accent" },
    update: {},
    create: { key: "color_accent", value: "#c2dcf2" },
  });

  console.log("✅ Default colors initialized!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

