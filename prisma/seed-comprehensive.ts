/**
 * Comprehensive Seed Script - 33 Opportunities (3 per category × 11 categories)
 * Run with: npx ts-node --skip-project prisma/seed-comprehensive.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Slugify utility - inline for seed script
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log('🌱 Seeding comprehensive opportunities database...');

  // Ensure domains exist
  const domains = await Promise.all([
    prisma.domain.upsert({
      where: { slug: 'cs' },
      update: {},
      create: { name: 'Computer Science', slug: 'cs' },
    }),
    prisma.domain.upsert({
      where: { slug: 'cybersecurity' },
      update: {},
      create: { name: 'Cybersecurity', slug: 'cybersecurity' },
    }),
    prisma.domain.upsert({
      where: { slug: 'math' },
      update: {},
      create: { name: 'Mathematics', slug: 'math' },
    }),
    prisma.domain.upsert({
      where: { slug: 'physics' },
      update: {},
      create: { name: 'Physics', slug: 'physics' },
    }),
    prisma.domain.upsert({
      where: { slug: 'chemistry' },
      update: {},
      create: { name: 'Chemistry', slug: 'chemistry' },
    }),
    prisma.domain.upsert({
      where: { slug: 'biology' },
      update: {},
      create: { name: 'Biology', slug: 'biology' },
    }),
    prisma.domain.upsert({
      where: { slug: 'astronomy' },
      update: {},
      create: { name: 'Astronomy', slug: 'astronomy' },
    }),
    prisma.domain.upsert({
      where: { slug: 'engineering' },
      update: {},
      create: { name: 'Engineering', slug: 'engineering' },
    }),
    prisma.domain.upsert({
      where: { slug: 'robotics' },
      update: {},
      create: { name: 'Robotics', slug: 'robotics' },
    }),
    prisma.domain.upsert({
      where: { slug: 'research' },
      update: {},
      create: { name: 'Research', slug: 'research' },
    }),
    prisma.domain.upsert({
      where: { slug: 'finance' },
      update: {},
      create: { name: 'Finance', slug: 'finance' },
    }),
    prisma.domain.upsert({
      where: { slug: 'business' },
      update: {},
      create: { name: 'Business', slug: 'business' },
    }),
    prisma.domain.upsert({
      where: { slug: 'economics' },
      update: {},
      create: { name: 'Economics', slug: 'economics' },
    }),
    prisma.domain.upsert({
      where: { slug: 'writing' },
      update: {},
      create: { name: 'Writing', slug: 'writing' },
    }),
    prisma.domain.upsert({
      where: { slug: 'arts' },
      update: {},
      create: { name: 'Arts', slug: 'arts' },
    }),
    prisma.domain.upsert({
      where: { slug: 'music' },
      update: {},
      create: { name: 'Music', slug: 'music' },
    }),
    prisma.domain.upsert({
      where: { slug: 'civics' },
      update: {},
      create: { name: 'Civics', slug: 'civics' },
    }),
    prisma.domain.upsert({
      where: { slug: 'policy' },
      update: {},
      create: { name: 'Policy', slug: 'policy' },
    }),
    prisma.domain.upsert({
      where: { slug: 'debate' },
      update: {},
      create: { name: 'Debate', slug: 'debate' },
    }),
    prisma.domain.upsert({
      where: { slug: 'environment' },
      update: {},
      create: { name: 'Environment', slug: 'environment' },
    }),
    prisma.domain.upsert({
      where: { slug: 'health' },
      update: {},
      create: { name: 'Health', slug: 'health' },
    }),
    prisma.domain.upsert({
      where: { slug: 'languages' },
      update: {},
      create: { name: 'Languages', slug: 'languages' },
    }),
  ]);

  console.log(`✅ Created/verified ${domains.length} domains`);

  // Helper to create opportunities
  const createOpportunity = async (data: {
    name: string;
    type: string;
    modality: string;
    structure: string;
    geography: string;
    description: string;
    website: string;
    domains: any[];
    edition: {
      cycle: string;
      status: string;
      regDeadline?: Date;
      eventStart?: Date;
      eventEnd?: Date;
      awards?: string[];
      gradeMin?: number;
      gradeMax?: number;
    };
  }) => {
    const slug = slugify(data.name);

    const opp = await prisma.opportunity.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: data.name,
        type: data.type as any,
        modality: data.modality as any,
        structure: data.structure as any,
        geography: data.geography as any,
        description: data.description,
        website: data.website,
      },
    });

    // Link domains
    for (const domain of data.domains) {
      await prisma.opportunityDomain.upsert({
        where: {
          opportunityId_domainId: {
            opportunityId: opp.id,
            domainId: domain.id,
          },
        },
        update: {},
        create: {
          opportunityId: opp.id,
          domainId: domain.id,
        },
      });
    }

    // Create edition
    await prisma.edition.upsert({
      where: { id: `${slug}-${data.edition.cycle.replace(/\s+/g, '-').toLowerCase()}` },
      update: {},
      create: {
        id: `${slug}-${data.edition.cycle.replace(/\s+/g, '-').toLowerCase()}`,
        opportunityId: opp.id,
        cycle: data.edition.cycle,
        status: data.edition.status as any,
        registrationDeadline: data.edition.regDeadline,
        eventStart: data.edition.eventStart,
        eventEnd: data.edition.eventEnd,
        awardTypes: data.edition.awards || [],
        gradeMin: data.edition.gradeMin || 9,
        gradeMax: data.edition.gradeMax || 12,
        popularityScore: Math.floor(Math.random() * 100),
        savesCount: Math.floor(Math.random() * 300),
        followsCount: Math.floor(Math.random() * 200),
        clicks30d: Math.floor(Math.random() * 500),
      },
    });

    return opp;
  };

  // === Computer Science & Cybersecurity ===
  await createOpportunity({
    name: 'USA Computing Olympiad (USACO)',
    type: 'competition',
    modality: 'online',
    structure: 'individual',
    geography: 'global',
    description:
      'USACO supports computing in the USA through online programming competitions, training resources, and selecting the team for the International Olympiad in Informatics.',
    website: 'http://usaco.org/',
    domains: [domains.find((d) => d.slug === 'cs')!],
    edition: {
      cycle: '2025-2026',
      status: 'upcoming',
      regDeadline: new Date('2025-12-10'),
      eventStart: new Date('2025-12-13'),
      eventEnd: new Date('2025-12-16'),
      awards: ['recognition'],
      gradeMin: 6,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'picoCTF (CMU)',
    type: 'competition',
    modality: 'online',
    structure: 'either',
    geography: 'global',
    description:
      'A free computer security education program with original content built on a capture-the-flag framework created by security experts at Carnegie Mellon University.',
    website: 'https://picoctf.org/',
    domains: [
      domains.find((d) => d.slug === 'cs')!,
      domains.find((d) => d.slug === 'cybersecurity')!,
    ],
    edition: {
      cycle: 'Spring 2026',
      status: 'upcoming',
      regDeadline: new Date('2026-03-15'),
      eventStart: new Date('2026-03-17'),
      eventEnd: new Date('2026-03-31'),
      awards: ['recognition'],
      gradeMin: 6,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'CyberPatriot — National Youth Cyber Defense Competition',
    type: 'competition',
    modality: 'hybrid',
    structure: 'team',
    geography: 'us_national',
    description:
      'The National Youth Cyber Defense Competition created by the Air Force Association to inspire K-12 students toward careers in cybersecurity.',
    website: 'https://www.uscyberpatriot.org/',
    domains: [domains.find((d) => d.slug === 'cybersecurity')!],
    edition: {
      cycle: '2025-2026',
      status: 'open',
      regDeadline: new Date('2025-11-30'),
      eventStart: new Date('2025-10-25'),
      eventEnd: new Date('2026-04-15'),
      awards: ['cash', 'scholarship'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  // === Math, Data & Modeling ===
  await createOpportunity({
    name: 'HiMCM — High School Mathematical Contest in Modeling (COMAP)',
    type: 'competition',
    modality: 'online',
    structure: 'team',
    geography: 'global',
    description:
      'An international contest where teams of students use mathematical modeling to solve real-world problems.',
    website: 'https://www.comap.com/contests/himcm-contest',
    domains: [domains.find((d) => d.slug === 'math')!],
    edition: {
      cycle: '2025-2026',
      status: 'upcoming',
      regDeadline: new Date('2025-11-01'),
      eventStart: new Date('2025-11-05'),
      eventEnd: new Date('2025-11-19'),
      awards: ['recognition'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: "Moody's Mega Math (M3) Challenge (SIAM)",
    type: 'competition',
    modality: 'online',
    structure: 'team',
    geography: 'us_national',
    description:
      'A contest for high school students to solve a real-world problem using mathematical modeling. Teams have 14 hours to research, model, and write a solution paper.',
    website: 'https://m3challenge.siam.org/',
    domains: [domains.find((d) => d.slug === 'math')!],
    edition: {
      cycle: '2026',
      status: 'upcoming',
      regDeadline: new Date('2026-02-15'),
      eventStart: new Date('2026-02-28'),
      eventEnd: new Date('2026-02-28'),
      awards: ['cash', 'scholarship'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'AMC–AIME–USAMO',
    type: 'competition',
    modality: 'hybrid',
    structure: 'individual',
    geography: 'us_national',
    description:
      'The AMC series is a set of contests designed to increase interest in mathematics and develop talent through challenging problems. Top scorers advance through AMC 10/12 to AIME to USAMO.',
    website: 'https://www.maa.org/math-competitions',
    domains: [domains.find((d) => d.slug === 'math')!],
    edition: {
      cycle: '2025-2026',
      status: 'open',
      regDeadline: new Date('2025-11-01'),
      eventStart: new Date('2025-11-07'),
      eventEnd: new Date('2026-03-25'),
      awards: ['recognition'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  // === Physics, Chemistry, Biology & Astronomy ===
  await createOpportunity({
    name: 'F=ma → USAPhO (AAPT)',
    type: 'competition',
    modality: 'hybrid',
    structure: 'individual',
    geography: 'us_national',
    description:
      'The path to the U.S. Physics Olympiad Team. Students take the F=ma exam, with top scorers invited to USAPhO, and top 20 attend training camp.',
    website: 'https://www.aapt.org/physicsteam/',
    domains: [domains.find((d) => d.slug === 'physics')!],
    edition: {
      cycle: '2026',
      status: 'upcoming',
      regDeadline: new Date('2025-12-15'),
      eventStart: new Date('2026-01-25'),
      eventEnd: new Date('2026-04-15'),
      awards: ['recognition'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'USABO — USA Biology Olympiad (CEE)',
    type: 'competition',
    modality: 'hybrid',
    structure: 'individual',
    geography: 'us_national',
    description:
      'A national biology competition leading to the International Biology Olympiad. Top students attend training camp and represent the USA internationally.',
    website: 'https://www.usabo-trc.org/',
    domains: [domains.find((d) => d.slug === 'biology')!],
    edition: {
      cycle: '2026',
      status: 'open',
      regDeadline: new Date('2026-01-31'),
      eventStart: new Date('2026-02-13'),
      eventEnd: new Date('2026-03-20'),
      awards: ['recognition'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'USNCO — U.S. National Chemistry Olympiad (ACS)',
    type: 'competition',
    modality: 'hybrid',
    structure: 'individual',
    geography: 'us_national',
    description:
      'A chemistry competition sponsored by the American Chemical Society. Top students compete for spots on the U.S. team for the International Chemistry Olympiad.',
    website: 'https://www.acs.org/education/students/highschool/olympiad.html',
    domains: [domains.find((d) => d.slug === 'chemistry')!],
    edition: {
      cycle: '2026',
      status: 'open',
      regDeadline: new Date('2026-02-28'),
      eventStart: new Date('2026-03-01'),
      eventEnd: new Date('2026-04-30'),
      awards: ['recognition'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  // === Engineering, Robotics & Maker ===
  await createOpportunity({
    name: 'FIRST Robotics Competition (FRC)',
    type: 'competition',
    modality: 'in_person',
    structure: 'team',
    geography: 'global',
    description:
      'An international high school robotics competition where teams design, build, and program robots to compete in an alliance format against other teams.',
    website: 'https://www.firstinspires.org/robotics/frc',
    domains: [
      domains.find((d) => d.slug === 'engineering')!,
      domains.find((d) => d.slug === 'robotics')!,
    ],
    edition: {
      cycle: '2025-2026',
      status: 'open',
      regDeadline: new Date('2026-01-10'),
      eventStart: new Date('2026-01-04'),
      eventEnd: new Date('2026-04-30'),
      awards: ['recognition', 'scholarship'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'FIRST Tech Challenge (FTC)',
    type: 'competition',
    modality: 'in_person',
    structure: 'team',
    geography: 'global',
    description:
      'A robotics competition for middle and high school students where teams design, build, program, and operate robots to compete head-to-head.',
    website: 'https://www.firstinspires.org/robotics/ftc',
    domains: [
      domains.find((d) => d.slug === 'engineering')!,
      domains.find((d) => d.slug === 'robotics')!,
    ],
    edition: {
      cycle: '2025-2026',
      status: 'open',
      regDeadline: new Date('2025-10-01'),
      eventStart: new Date('2025-09-07'),
      eventEnd: new Date('2026-04-30'),
      awards: ['recognition'],
      gradeMin: 7,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'VEX V5 Robotics Competition (REC Foundation)',
    type: 'competition',
    modality: 'in_person',
    structure: 'team',
    geography: 'global',
    description:
      'The VEX Robotics Competition brings STEM learning to life by challenging students to work in teams to design, build, and code robots.',
    website: 'https://www.vexrobotics.com/',
    domains: [
      domains.find((d) => d.slug === 'engineering')!,
      domains.find((d) => d.slug === 'robotics')!,
    ],
    edition: {
      cycle: '2025-2026',
      status: 'open',
      regDeadline: new Date('2025-09-01'),
      eventStart: new Date('2025-08-01'),
      eventEnd: new Date('2026-04-30'),
      awards: ['recognition'],
      gradeMin: 6,
      gradeMax: 12,
    },
  });

  // === Research, Lab & Innovation ===
  await createOpportunity({
    name: 'MITES Summer (MIT)',
    type: 'program',
    modality: 'in_person',
    structure: 'individual',
    geography: 'us_national',
    description:
      'The MIT Introduction to Technology, Engineering, and Science (MITES) program is a rigorous six-week residential STEM program for rising high school seniors.',
    website: 'https://mites.mit.edu/',
    domains: [
      domains.find((d) => d.slug === 'research')!,
      domains.find((d) => d.slug === 'engineering')!,
    ],
    edition: {
      cycle: 'Summer 2026',
      status: 'upcoming',
      regDeadline: new Date('2026-01-31'),
      eventStart: new Date('2026-06-20'),
      eventEnd: new Date('2026-08-01'),
      awards: [],
      gradeMin: 11,
      gradeMax: 11,
    },
  });

  await createOpportunity({
    name: 'Boston University RISE',
    type: 'program',
    modality: 'in_person',
    structure: 'individual',
    geography: 'us_national',
    description:
      'A summer internship program in which students work in Boston University labs for six weeks conducting original scientific research.',
    website: 'https://www.bu.edu/summer/high-school-programs/research-in-science-engineering/',
    domains: [domains.find((d) => d.slug === 'research')!],
    edition: {
      cycle: 'Summer 2026',
      status: 'upcoming',
      regDeadline: new Date('2026-02-15'),
      eventStart: new Date('2026-07-01'),
      eventEnd: new Date('2026-08-10'),
      awards: [],
      gradeMin: 11,
      gradeMax: 11,
    },
  });

  await createOpportunity({
    name: 'Research Science Institute (RSI)',
    type: 'program',
    modality: 'in_person',
    structure: 'individual',
    geography: 'us_national',
    description:
      'The most prestigious summer science & engineering program for high school students, hosted by MIT and sponsored by Center for Excellence in Education.',
    website: 'https://www.cee.org/research-science-institute',
    domains: [domains.find((d) => d.slug === 'research')!],
    edition: {
      cycle: 'Summer 2026',
      status: 'upcoming',
      regDeadline: new Date('2026-01-15'),
      eventStart: new Date('2026-06-21'),
      eventEnd: new Date('2026-07-31'),
      awards: [],
      gradeMin: 11,
      gradeMax: 11,
    },
  });

  // === Business, Finance & Entrepreneurship ===
  await createOpportunity({
    name: 'DECA',
    type: 'competition',
    modality: 'in_person',
    structure: 'either',
    geography: 'us_national',
    description:
      'DECA prepares emerging leaders and entrepreneurs in marketing, finance, hospitality and management through competitions, conferences, and educational programs.',
    website: 'https://www.deca.org/',
    domains: [
      domains.find((d) => d.slug === 'business')!,
      domains.find((d) => d.slug === 'finance')!,
    ],
    edition: {
      cycle: '2025-2026',
      status: 'open',
      regDeadline: new Date('2026-02-01'),
      eventStart: new Date('2025-11-01'),
      eventEnd: new Date('2026-04-30'),
      awards: ['recognition', 'scholarship'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'FBLA',
    type: 'competition',
    modality: 'in_person',
    structure: 'either',
    geography: 'us_national',
    description:
      'Future Business Leaders of America inspires and prepares students to become community-minded business leaders through competitions and leadership programs.',
    website: 'https://www.fbla.org/',
    domains: [domains.find((d) => d.slug === 'business')!],
    edition: {
      cycle: '2025-2026',
      status: 'open',
      regDeadline: new Date('2026-03-01'),
      eventStart: new Date('2025-10-01'),
      eventEnd: new Date('2026-06-30'),
      awards: ['recognition', 'scholarship'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'National Economics Challenge (CEE)',
    type: 'competition',
    modality: 'hybrid',
    structure: 'team',
    geography: 'us_national',
    description:
      "The country's only economics competition, testing students' knowledge of economics and their ability to apply it to real-world situations.",
    website: 'https://www.councilforeconed.org/national-economics-challenge/',
    domains: [
      domains.find((d) => d.slug === 'economics')!,
      domains.find((d) => d.slug === 'finance')!,
    ],
    edition: {
      cycle: '2025-2026',
      status: 'open',
      regDeadline: new Date('2026-02-15'),
      eventStart: new Date('2026-05-05'),
      eventEnd: new Date('2026-05-06'),
      awards: ['cash', 'scholarship', 'recognition'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  // === Writing, Arts, Music & Media ===
  await createOpportunity({
    name: 'Scholastic Art & Writing Awards',
    type: 'competition',
    modality: 'online',
    structure: 'individual',
    geography: 'us_national',
    description:
      "The nation's longest-running and most prestigious recognition program for creative teens in grades 7–12.",
    website: 'https://www.artandwriting.org/',
    domains: [domains.find((d) => d.slug === 'writing')!, domains.find((d) => d.slug === 'arts')!],
    edition: {
      cycle: '2025-2026',
      status: 'open',
      regDeadline: new Date('2026-01-10'),
      eventStart: new Date('2026-03-15'),
      eventEnd: new Date('2026-03-15'),
      awards: ['cash', 'scholarship', 'publication'],
      gradeMin: 7,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'YoungArts National Arts Competition',
    type: 'competition',
    modality: 'online',
    structure: 'individual',
    geography: 'us_national',
    description:
      'Recognizes and supports emerging artists in the visual, literary, design, and performing arts. Winners receive awards and mentorship opportunities.',
    website: 'https://www.youngarts.org/',
    domains: [
      domains.find((d) => d.slug === 'arts')!,
      domains.find((d) => d.slug === 'music')!,
      domains.find((d) => d.slug === 'writing')!,
    ],
    edition: {
      cycle: '2026',
      status: 'upcoming',
      regDeadline: new Date('2025-10-15'),
      eventStart: new Date('2026-01-15'),
      eventEnd: new Date('2026-01-24'),
      awards: ['cash', 'recognition'],
      gradeMin: 10,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'Bow Seat Ocean Awareness Contest',
    type: 'competition',
    modality: 'online',
    structure: 'individual',
    geography: 'global',
    description:
      'An international competition for youth to explore the ocean and share their vision for a better future through art, creative writing, poetry, film, music, and multimedia.',
    website: 'https://bowseat.org/programs/ocean-awareness-contest/',
    domains: [
      domains.find((d) => d.slug === 'arts')!,
      domains.find((d) => d.slug === 'writing')!,
      domains.find((d) => d.slug === 'environment')!,
    ],
    edition: {
      cycle: '2026',
      status: 'open',
      regDeadline: new Date('2026-06-15'),
      eventStart: new Date('2026-09-01'),
      eventEnd: new Date('2026-09-01'),
      awards: ['cash'],
      gradeMin: 6,
      gradeMax: 12,
    },
  });

  // === Civics, Policy, Debate & Law ===
  await createOpportunity({
    name: 'U.S. Senate Youth Program (USSYP)',
    type: 'program',
    modality: 'in_person',
    structure: 'individual',
    geography: 'us_national',
    description:
      'A highly selective program that brings 104 outstanding high school students to Washington, D.C., for an intensive week-long study of the federal government.',
    website: 'https://ussenateyouth.org/',
    domains: [domains.find((d) => d.slug === 'civics')!, domains.find((d) => d.slug === 'policy')!],
    edition: {
      cycle: '2026',
      status: 'upcoming',
      regDeadline: new Date('2025-10-01'),
      eventStart: new Date('2026-03-07'),
      eventEnd: new Date('2026-03-14'),
      awards: ['scholarship'],
      gradeMin: 11,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'American Legion Oratorical Contest',
    type: 'competition',
    modality: 'in_person',
    structure: 'individual',
    geography: 'us_national',
    description:
      "A constitutional speech contest designed to develop high school students' knowledge and appreciation for the U.S. Constitution.",
    website: 'https://www.legion.org/oratorical',
    domains: [domains.find((d) => d.slug === 'civics')!, domains.find((d) => d.slug === 'debate')!],
    edition: {
      cycle: '2025-2026',
      status: 'open',
      regDeadline: new Date('2025-11-15'),
      eventStart: new Date('2025-12-01'),
      eventEnd: new Date('2026-04-15'),
      awards: ['scholarship'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'Ethics Bowl (NHSEB)',
    type: 'competition',
    modality: 'hybrid',
    structure: 'team',
    geography: 'us_national',
    description:
      'A competitive yet collaborative event in which students discuss real-life ethical dilemmas and are evaluated on the depth of their thinking and their ability to respond to counterpoints.',
    website: 'https://nhseb.unc.edu/',
    domains: [domains.find((d) => d.slug === 'civics')!, domains.find((d) => d.slug === 'debate')!],
    edition: {
      cycle: '2025-2026',
      status: 'open',
      regDeadline: new Date('2025-12-01'),
      eventStart: new Date('2026-02-01'),
      eventEnd: new Date('2026-04-26'),
      awards: ['recognition'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  // === Environment, Life Sciences & Health ===
  await createOpportunity({
    name: 'Stockholm Junior Water Prize (U.S.)',
    type: 'competition',
    modality: 'hybrid',
    structure: 'either',
    geography: 'us_national',
    description:
      'An international competition for students who have completed an outstanding water-related science, engineering, or policy project.',
    website: 'https://www.wef.org/sjwp/',
    domains: [domains.find((d) => d.slug === 'environment')!],
    edition: {
      cycle: '2026',
      status: 'upcoming',
      regDeadline: new Date('2026-03-01'),
      eventStart: new Date('2026-08-01'),
      eventEnd: new Date('2026-08-28'),
      awards: ['cash', 'recognition'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'Envirothon',
    type: 'competition',
    modality: 'in_person',
    structure: 'team',
    geography: 'us_national',
    description:
      'A hands-on environmental problem-solving competition for high school teams. Tests knowledge of aquatic ecology, forestry, soils, wildlife, and current environmental issues.',
    website: 'https://envirothon.org/',
    domains: [domains.find((d) => d.slug === 'environment')!],
    edition: {
      cycle: '2025-2026',
      status: 'open',
      regDeadline: new Date('2026-03-01'),
      eventStart: new Date('2025-11-01'),
      eventEnd: new Date('2026-07-30'),
      awards: ['scholarship'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'HOSA — Future Health Professionals',
    type: 'competition',
    modality: 'in_person',
    structure: 'either',
    geography: 'us_national',
    description:
      'A national student organization endorsed by the U.S. Department of Education and the Health Science Technology Education Division of ACTE.',
    website: 'https://hosa.org/',
    domains: [domains.find((d) => d.slug === 'health')!],
    edition: {
      cycle: '2025-2026',
      status: 'open',
      regDeadline: new Date('2026-03-01'),
      eventStart: new Date('2025-10-01'),
      eventEnd: new Date('2026-06-30'),
      awards: ['recognition', 'scholarship'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  // === Language, Global & Exchange ===
  await createOpportunity({
    name: 'NSLI-Y',
    type: 'program',
    modality: 'in_person',
    structure: 'individual',
    geography: 'global',
    description:
      'The National Security Language Initiative for Youth (NSLI-Y) provides merit-based scholarships for U.S. high school students to learn less commonly taught languages abroad.',
    website: 'https://www.nsliforyouth.org/',
    domains: [domains.find((d) => d.slug === 'languages')!],
    edition: {
      cycle: '2026-2027',
      status: 'upcoming',
      regDeadline: new Date('2026-01-15'),
      eventStart: new Date('2026-06-15'),
      eventEnd: new Date('2027-06-30'),
      awards: ['scholarship'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'CBYX',
    type: 'program',
    modality: 'in_person',
    structure: 'individual',
    geography: 'global',
    description:
      'Congress-Bundestag Youth Exchange for Young Professionals (CBYX) provides full scholarships for American students to spend one academic year in Germany.',
    website: 'https://usagermanscholarship.org/',
    domains: [domains.find((d) => d.slug === 'languages')!],
    edition: {
      cycle: '2026-2027',
      status: 'upcoming',
      regDeadline: new Date('2025-12-01'),
      eventStart: new Date('2026-08-01'),
      eventEnd: new Date('2027-07-31'),
      awards: ['scholarship'],
      gradeMin: 11,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'YES Abroad',
    type: 'program',
    modality: 'in_person',
    structure: 'individual',
    geography: 'global',
    description:
      'The Kennedy-Lugar Youth Exchange and Study (YES) Abroad program provides scholarships for American high school students to spend an academic year abroad.',
    website: 'https://www.yesabroad.org/',
    domains: [domains.find((d) => d.slug === 'languages')!],
    edition: {
      cycle: '2026-2027',
      status: 'upcoming',
      regDeadline: new Date('2025-11-15'),
      eventStart: new Date('2026-08-01'),
      eventEnd: new Date('2027-07-31'),
      awards: ['scholarship'],
      gradeMin: 9,
      gradeMax: 12,
    },
  });

  // === Scholarships (national) ===
  await createOpportunity({
    name: 'Coolidge Scholarship',
    type: 'scholarship',
    modality: 'online',
    structure: 'individual',
    geography: 'us_national',
    description:
      'A full-ride, four-year presidential scholarship for juniors who excel academically, show leadership, and aspire to make a positive impact.',
    website: 'https://coolidgescholars.org/',
    domains: [],
    edition: {
      cycle: 'Class of 2027',
      status: 'open',
      regDeadline: new Date('2026-01-21'),
      eventStart: new Date('2026-05-01'),
      eventEnd: new Date('2026-05-01'),
      awards: ['scholarship'],
      gradeMin: 11,
      gradeMax: 11,
    },
  });

  await createOpportunity({
    name: 'Davidson Fellows Scholarship',
    type: 'scholarship',
    modality: 'online',
    structure: 'individual',
    geography: 'us_national',
    description:
      'Awards of $50,000, $25,000 and $10,000 to students 18 or younger who have completed a significant piece of work in science, technology, engineering, mathematics, literature, music, or philosophy.',
    website: 'https://www.davidsongifted.org/gifted-programs/fellows-scholarship/',
    domains: [],
    edition: {
      cycle: '2026',
      status: 'upcoming',
      regDeadline: new Date('2026-02-12'),
      eventStart: new Date('2026-09-01'),
      eventEnd: new Date('2026-09-01'),
      awards: ['scholarship'],
      gradeMin: 6,
      gradeMax: 12,
    },
  });

  await createOpportunity({
    name: 'Coca-Cola Scholars Program',
    type: 'scholarship',
    modality: 'online',
    structure: 'individual',
    geography: 'us_national',
    description:
      'An achievement-based scholarship awarded to graduating high school seniors. 150 Coca-Cola Scholars are selected each year to receive college scholarships.',
    website: 'https://www.coca-colascholarsfoundation.org/',
    domains: [],
    edition: {
      cycle: 'Class of 2026',
      status: 'open',
      regDeadline: new Date('2025-10-31'),
      eventStart: new Date('2026-03-01'),
      eventEnd: new Date('2026-03-01'),
      awards: ['scholarship'],
      gradeMin: 12,
      gradeMax: 12,
    },
  });

  console.log('✅ Created 33 comprehensive opportunities across 11 categories');
  console.log('');
  console.log('🎉 Comprehensive seeding complete!');
  console.log('');
  console.log('📍 Visit: http://localhost:3000/opportunities');
  console.log('');
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
