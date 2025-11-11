import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const opportunities = await prisma.volunteeringOpportunity.findMany({
      where: {
        status: "approved",
      },
      select: {
        id: true,
        title: true,
        organization: true,
        status: true,
        category: true,
        location: true,
      },
    });

    console.log(`Found ${opportunities.length} approved opportunities:`);
    opportunities.forEach((opp) => {
      console.log(`- ${opp.title} (${opp.organization}) - Status: ${opp.status}`);
    });
  } catch (error: any) {
    console.error("Error:", error.message);
    console.error(error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

