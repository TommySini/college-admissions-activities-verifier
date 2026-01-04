import type { OpportunitiesFilter } from '@/lib/filters';

/**
 * Temporary mocked editions used as a fallback when the live opportunities API is unavailable.
 * Replace this dataset with web-sourced data ingestion once that pipeline is ready.
 */

type MockOpportunityDomain = {
  domain: {
    id: string;
    slug: string;
    name: string;
  };
};

type MockOpportunity = {
  slug: string;
  name: string;
  provider?: { name: string };
  modality: 'online' | 'in_person' | 'hybrid';
  type: string;
  structure: 'team' | 'individual';
  geography?: string;
  description?: string;
  location?: { city?: string; state?: string; country?: string };
  domains: MockOpportunityDomain[];
  website?: string;
};

export type MockEdition = {
  id: string;
  status: 'open' | 'upcoming' | 'closed';
  registrationDeadline?: string;
  eventStart?: string;
  eventEnd?: string;
  awardTypes?: string[];
  saves: any[];
  follows: any[];
  participations: { schoolId: string }[];
  savesCount: number;
  followsCount: number;
  popularityScore: number;
  registrationFee?: number | null;
  opportunity: MockOpportunity;
};

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const MOCK_OPPORTUNITIES: MockEdition[] = [
  {
    id: 'mock-global-stem',
    status: 'open',
    registrationDeadline: daysFromNow(45),
    eventStart: daysFromNow(70),
    eventEnd: daysFromNow(73),
    awardTypes: ['scholarship', 'travel_stipend'],
    saves: [],
    follows: [],
    participations: [{ schoolId: 'demo-school' }],
    savesCount: 128,
    followsCount: 64,
    popularityScore: 82,
    registrationFee: null,
    opportunity: {
      slug: 'global-stem-challenge',
      name: 'Global STEM Challenge',
      provider: { name: 'STEM Innovators' },
      modality: 'online',
      type: 'competition',
      structure: 'team',
      geography: 'global',
      description:
        'A collaborative engineering challenge where teams prototype solutions to global sustainability problems.',
      location: { city: 'Remote', country: 'Online' },
      domains: [
        { domain: { id: 'stem', slug: 'stem', name: 'STEM' } },
        { domain: { id: 'sustainability', slug: 'sustainability', name: 'Sustainability' } },
      ],
      website: 'https://example.com/global-stem',
    },
  },
  {
    id: 'mock-civic-leadership',
    status: 'upcoming',
    registrationDeadline: daysFromNow(25),
    eventStart: daysFromNow(120),
    eventEnd: daysFromNow(125),
    awardTypes: ['stipend'],
    saves: [],
    follows: [],
    participations: [],
    savesCount: 58,
    followsCount: 41,
    popularityScore: 61,
    registrationFee: 150,
    opportunity: {
      slug: 'civic-leadership-summit',
      name: 'Civic Leadership Summit',
      provider: { name: 'Future Leaders Network' },
      modality: 'in_person',
      type: 'program',
      structure: 'individual',
      geography: 'national',
      description:
        'Week-long residential program focused on policy design, public speaking, and community impact.',
      location: { city: 'Washington', state: 'DC', country: 'USA' },
      domains: [
        { domain: { id: 'leadership', slug: 'leadership', name: 'Leadership' } },
        { domain: { id: 'civics', slug: 'civics', name: 'Civics' } },
      ],
      website: 'https://example.com/civic-leadership',
    },
  },
  {
    id: 'mock-creative-writing',
    status: 'open',
    registrationDeadline: daysFromNow(10),
    eventStart: daysFromNow(30),
    eventEnd: daysFromNow(31),
    awardTypes: ['publication'],
    saves: [],
    follows: [],
    participations: [{ schoolId: 'demo-school' }],
    savesCount: 23,
    followsCount: 19,
    popularityScore: 48,
    registrationFee: 0,
    opportunity: {
      slug: 'creative-writing-lab',
      name: 'Creative Writing Lab',
      provider: { name: 'Writers Collective' },
      modality: 'hybrid',
      type: 'workshop',
      structure: 'individual',
      geography: 'regional',
      description:
        'Hybrid workshop for storytellers to develop short fiction pieces with mentorship from published authors.',
      location: { city: 'Austin', state: 'TX', country: 'USA' },
      domains: [
        { domain: { id: 'arts', slug: 'arts', name: 'Arts & Culture' } },
        { domain: { id: 'writing', slug: 'writing', name: 'Writing' } },
      ],
      website: 'https://example.com/creative-writing-lab',
    },
  },
];

function matchesCommaSeparated(value: string | undefined, target: string) {
  if (!value) return true;
  return value
    .toLowerCase()
    .split(',')
    .some((entry) => entry.trim() === target.toLowerCase());
}

export function getMockOpportunities(filters: OpportunitiesFilter) {
  const search = filters.q?.toLowerCase().trim();
  const domainFilters = filters.domain?.split(',').map((d) => d.trim().toLowerCase());

  let results = MOCK_OPPORTUNITIES.filter((edition) => {
    const { opportunity } = edition;
    const matchesSearch = search
      ? [
          opportunity.name,
          opportunity.provider?.name,
          ...opportunity.domains.map((d) => d.domain.name),
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(search))
      : true;

    const matchesType = matchesCommaSeparated(filters.type, opportunity.type);
    const matchesModality = matchesCommaSeparated(filters.modality, opportunity.modality);
    const matchesStructure = matchesCommaSeparated(filters.structure, opportunity.structure);
    const matchesStatus = matchesCommaSeparated(filters.status, edition.status);

    const matchesDomain = domainFilters
      ? opportunity.domains.some((d) => domainFilters.includes(d.domain.slug.toLowerCase()))
      : true;

    const matchesPopular = filters.popular === 'true' ? edition.popularityScore >= 60 : true;
    const matchesDoneAtSchool =
      filters.doneAtMySchool === 'true'
        ? edition.participations.length > 0
        : true;
    const matchesFree =
      filters.free === 'true' ? (edition.registrationFee ?? 0) === 0 : true;

    return (
      matchesSearch &&
      matchesType &&
      matchesModality &&
      matchesStructure &&
      matchesStatus &&
      matchesDomain &&
      matchesPopular &&
      matchesDoneAtSchool &&
      matchesFree
    );
  });

  switch (filters.sort) {
    case 'deadlineSoon':
      results = [...results].sort((a, b) => {
        const aDate = a.registrationDeadline ? new Date(a.registrationDeadline).getTime() : Infinity;
        const bDate = b.registrationDeadline ? new Date(b.registrationDeadline).getTime() : Infinity;
        return aDate - bDate;
      });
      break;
    case 'popularityDesc':
      results = [...results].sort((a, b) => b.popularityScore - a.popularityScore);
      break;
    default:
      break;
  }

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 24;
  const start = (page - 1) * pageSize;

  return {
    editions: results.slice(start, start + pageSize),
    total: results.length,
  };
}

