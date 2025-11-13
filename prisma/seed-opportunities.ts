/**
 * Seed script for Opportunities Platform
 * Run with: npx ts-node --skip-project prisma/seed-opportunities.ts
 * Or add to package.json: "prisma": { "seed": "ts-node prisma/seed-opportunities.ts" }
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding opportunities database...");

  // Create domains
  const domains = await Promise.all([
    prisma.domain.upsert({
      where: { slug: "finance" },
      update: {},
      create: { name: "Finance", slug: "finance", description: "Finance, economics, and business opportunities" },
    }),
    prisma.domain.upsert({
      where: { slug: "cs" },
      update: {},
      create: { name: "Computer Science", slug: "cs", description: "Programming, software, and technology" },
    }),
    prisma.domain.upsert({
      where: { slug: "math" },
      update: {},
      create: { name: "Mathematics", slug: "math", description: "Pure and applied mathematics" },
    }),
    prisma.domain.upsert({
      where: { slug: "science" },
      update: {},
      create: { name: "Science", slug: "science", description: "Biology, chemistry, physics, and research" },
    }),
    prisma.domain.upsert({
      where: { slug: "writing" },
      update: {},
      create: { name: "Writing", slug: "writing", description: "Creative writing, journalism, and publishing" },
    }),
    prisma.domain.upsert({
      where: { slug: "arts" },
      update: {},
      create: { name: "Arts & Design", slug: "arts", description: "Visual arts, music, and creative design" },
    }),
  ]);

  console.log(`✅ Created ${domains.length} domains`);

  // Create providers
  const providers = await Promise.all([
    prisma.provider.upsert({
      where: { slug: "national-economics" },
      update: {},
      create: {
        name: "National Economics Challenge",
        slug: "national-economics",
        website: "https://www.councilforeconed.org/national-economics-challenge/",
        verified: true,
      },
    }),
    prisma.provider.upsert({
      where: { slug: "usaco" },
      update: {},
      create: {
        name: "USA Computing Olympiad",
        slug: "usaco",
        website: "http://usaco.org/",
        verified: true,
      },
    }),
    prisma.provider.upsert({
      where: { slug: "scholastic-art-writing" },
      update: {},
      create: {
        name: "Scholastic Art & Writing Awards",
        slug: "scholastic-art-writing",
        website: "https://www.artandwriting.org/",
        verified: true,
      },
    }),
  ]);

  console.log(`✅ Created ${providers.length} providers`);

  // Create sample schools
  const schools = await Promise.all([
    prisma.school.upsert({
      where: { name: "Lincoln High School" },
      update: {},
      create: {
        name: "Lincoln High School",
        city: "Portland",
        state: "OR",
        country: "USA",
      },
    }),
    prisma.school.upsert({
      where: { name: "Washington STEM Academy" },
      update: {},
      create: {
        name: "Washington STEM Academy",
        city: "Seattle",
        state: "WA",
        country: "USA",
      },
    }),
  ]);

  console.log(`✅ Created ${schools.length} schools`);

  // Create opportunities with editions
  
  // 1. National Economics Challenge
  const necOpp = await prisma.opportunity.upsert({
    where: { slug: "national-economics-challenge-2026" },
    update: {},
    create: {
      slug: "national-economics-challenge-2026",
      name: "National Economics Challenge",
      type: "competition",
      modality: "hybrid",
      structure: "team",
      teamMin: 3,
      teamMax: 4,
      geography: "us_national",
      description: "The National Economics Challenge is the country's only economics competition of its kind and is open to high school students in all 50 states.",
      website: "https://www.councilforeconed.org/national-economics-challenge/",
      providerId: providers[0].id,
    },
  });

  await prisma.opportunityDomain.upsert({
    where: {
      opportunityId_domainId: {
        opportunityId: necOpp.id,
        domainId: domains[0].id, // Finance
      },
    },
    update: {},
    create: {
      opportunityId: necOpp.id,
      domainId: domains[0].id,
    },
  });

  const necEdition = await prisma.edition.upsert({
    where: { id: "nec-2025-2026" },
    update: {},
    create: {
      id: "nec-2025-2026",
      opportunityId: necOpp.id,
      cycle: "2025-2026",
      status: "open",
      applicationOpens: new Date("2025-09-01"),
      applicationCloses: new Date("2026-02-15"),
      registrationDeadline: new Date("2026-02-15"),
      eventStart: new Date("2026-05-05"),
      eventEnd: new Date("2026-05-06"),
      gradeMin: 9,
      gradeMax: 12,
      registrationFee: 0,
      awardTypes: ["cash", "scholarship", "recognition"], // Prisma handles JSON serialization
      alumniOutcomesNotable: true,
      popularityScore: 85,
      savesCount: 142,
      followsCount: 98,
      clicks30d: 324,
    },
  });

  // 2. USACO Competition
  const usacoOpp = await prisma.opportunity.upsert({
    where: { slug: "usaco-december-2025" },
    update: {},
    create: {
      slug: "usaco-december-2025",
      name: "USA Computing Olympiad (USACO)",
      type: "competition",
      modality: "online",
      structure: "individual",
      geography: "global",
      description: "USACO supports computing in the USA through online programming competitions, training resources, and selecting the team for the International Olympiad in Informatics.",
      website: "http://usaco.org/",
      providerId: providers[1].id,
    },
  });

  await prisma.opportunityDomain.upsert({
    where: {
      opportunityId_domainId: {
        opportunityId: usacoOpp.id,
        domainId: domains[1].id, // CS
      },
    },
    update: {},
    create: {
      opportunityId: usacoOpp.id,
      domainId: domains[1].id,
    },
  });

  const usacoEdition = await prisma.edition.upsert({
    where: { id: "usaco-dec-2025" },
    update: {},
    create: {
      id: "usaco-dec-2025",
      opportunityId: usacoOpp.id,
      cycle: "December 2025",
      status: "upcoming",
      applicationOpens: new Date("2025-11-01"),
      registrationDeadline: new Date("2025-12-15"),
      eventStart: new Date("2025-12-13"),
      eventEnd: new Date("2025-12-16"),
      gradeMin: 6,
      gradeMax: 12,
      registrationFee: 0,
      awardTypes: ["recognition"], // Prisma handles JSON serialization
      alumniOutcomesNotable: true,
      popularityScore: 92,
      savesCount: 287,
      followsCount: 213,
      clicks30d: 651,
    },
  });

  // 3. Test opportunity with NO awards (empty array)
  const testOpp = await prisma.opportunity.upsert({
    where: { slug: "test-program-no-awards" },
    update: {},
    create: {
      slug: "test-program-no-awards",
      name: "Test Summer Program (No Awards)",
      type: "program",
      modality: "online",
      structure: "individual",
      geography: "global",
      description: "A test program with no awards to ensure empty array handling.",
      website: "https://example.com/test",
    },
  });

  await prisma.opportunityDomain.upsert({
    where: {
      opportunityId_domainId: {
        opportunityId: testOpp.id,
        domainId: domains[2].id, // Math
      },
    },
    update: {},
    create: {
      opportunityId: testOpp.id,
      domainId: domains[2].id,
    },
  });

  await prisma.edition.upsert({
    where: { id: "test-program-2026" },
    update: {},
    create: {
      id: "test-program-2026",
      opportunityId: testOpp.id,
      cycle: "Summer 2026",
      status: "upcoming",
      registrationDeadline: new Date("2026-04-01"),
      eventStart: new Date("2026-07-01"),
      eventEnd: new Date("2026-07-30"),
      gradeMin: 9,
      gradeMax: 11,
      registrationFee: 100,
      awardTypes: [], // EMPTY ARRAY TEST
      alumniOutcomesNotable: false,
      popularityScore: 15,
      savesCount: 8,
      followsCount: 3,
      clicks30d: 42,
    },
  });

  // 4. Scholastic Art & Writing Awards
  const scholasticOpp = await prisma.opportunity.upsert({
    where: { slug: "scholastic-art-writing-awards-2026" },
    update: {},
    create: {
      slug: "scholastic-art-writing-awards-2026",
      name: "Scholastic Art & Writing Awards",
      type: "competition",
      modality: "online",
      structure: "individual",
      geography: "us_national",
      description: "The nation's longest-running and most prestigious recognition program for creative teens in grades 7–12.",
      website: "https://www.artandwriting.org/",
      providerId: providers[2].id,
    },
  });

  await Promise.all([
    prisma.opportunityDomain.upsert({
      where: {
        opportunityId_domainId: {
          opportunityId: scholasticOpp.id,
          domainId: domains[4].id, // Writing
        },
      },
      update: {},
      create: {
        opportunityId: scholasticOpp.id,
        domainId: domains[4].id,
      },
    }),
    prisma.opportunityDomain.upsert({
      where: {
        opportunityId_domainId: {
          opportunityId: scholasticOpp.id,
          domainId: domains[5].id, // Arts
        },
      },
      update: {},
      create: {
        opportunityId: scholasticOpp.id,
        domainId: domains[5].id,
      },
    }),
  ]);

  const scholasticEdition = await prisma.edition.upsert({
    where: { id: "scholastic-2025-2026" },
    update: {},
    create: {
      id: "scholastic-2025-2026",
      opportunityId: scholasticOpp.id,
      cycle: "2025-2026",
      status: "open",
      applicationOpens: new Date("2025-09-01"),
      registrationDeadline: new Date("2026-01-10"),
      eventStart: new Date("2026-03-15"),
      eventEnd: new Date("2026-03-15"),
      gradeMin: 7,
      gradeMax: 12,
      registrationFee: 0,
      awardTypes: ["cash", "scholarship", "publication"], // Prisma handles JSON serialization
      alumniOutcomesNotable: true,
      popularityScore: 78,
      savesCount: 198,
      followsCount: 156,
      clicks30d: 423,
    },
  });

  // Add participation records (social proof)
  await Promise.all([
    prisma.participation.upsert({
      where: {
        schoolId_editionId: {
          schoolId: schools[0].id,
          editionId: necEdition.id,
        },
      },
      update: {},
      create: {
        schoolId: schools[0].id,
        editionId: necEdition.id,
        count: 3,
        year: 2025,
      },
    }),
    prisma.participation.upsert({
      where: {
        schoolId_editionId: {
          schoolId: schools[1].id,
          editionId: usacoEdition.id,
        },
      },
      update: {},
      create: {
        schoolId: schools[1].id,
        editionId: usacoEdition.id,
        count: 12,
        year: 2025,
      },
    }),
  ]);

  console.log("✅ Created 4 opportunities with editions");
  console.log("   - 3 with various awards, 1 with empty awards array");
  console.log("✅ Added participation records");
  console.log("");
  console.log("🎉 Seeding complete!");
  console.log("");
  console.log("📍 Visit: http://localhost:3000/opportunities");
  console.log("");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

