import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OpportunitiesFilterSchema, buildWhereClause, buildOrderBy } from '@/lib/filters';
import { getCurrentUser } from '@/lib/auth';
import { normalizeEdition } from '@/lib/normalize';

// Cache public opportunity listings for 5 minutes
export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = Object.fromEntries(searchParams.entries());

    // Parse and validate filters
    const filters = OpportunitiesFilterSchema.parse(params);

    // Get current user for personalization
    const user = await getCurrentUser();
    const { editionWhere } = buildWhereClause(filters, user?.id, user?.schoolId || undefined);

    // Build the query
    const orderBy = buildOrderBy(filters.sort);
    const skip = (filters.page - 1) * filters.pageSize;

    // Search query handling
    let searchWhere = {};
    if (filters.q) {
      searchWhere = {
        OR: [
          { opportunity: { name: { contains: filters.q, mode: 'insensitive' } } },
          { opportunity: { description: { contains: filters.q, mode: 'insensitive' } } },
          { opportunity: { provider: { name: { contains: filters.q, mode: 'insensitive' } } } },
        ],
      };
    }

    // Combine all where clauses
    const finalWhere = {
      ...editionWhere,
      ...searchWhere,
    };

    // Fetch editions with related data
    const [editions, total] = await Promise.all([
      prisma.edition.findMany({
        where: finalWhere,
        include: {
          opportunity: {
            include: {
              provider: true,
              location: true,
              domains: {
                include: {
                  domain: true,
                },
              },
            },
          },
          participations: user?.schoolId
            ? {
                where: {
                  schoolId: user.schoolId,
                },
              }
            : false,
          saves: user
            ? {
                where: {
                  userId: user.id,
                },
              }
            : false,
          follows: user
            ? {
                where: {
                  userId: user.id,
                },
              }
            : false,
          _count: {
            select: {
              saves: true,
              follows: true,
            },
          },
        },
        orderBy,
        skip,
        take: filters.pageSize,
      }),
      prisma.edition.count({ where: finalWhere }),
    ]);

    // Track analytics (click tracking)
    if (editions.length > 0) {
      // Log impression for analytics (could be batched)
      // For now, we'll skip to avoid performance impact
    }

    // Calculate duration for each edition (if duration filter applied)
    let filteredEditions = editions;
    if (filters.durationMinDays !== undefined || filters.durationMaxDays !== undefined) {
      filteredEditions = editions.filter((edition) => {
        if (!edition.eventStart || !edition.eventEnd) return false;
        const durationMs = edition.eventEnd.getTime() - edition.eventStart.getTime();
        const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

        if (filters.durationMinDays !== undefined && durationDays < filters.durationMinDays) {
          return false;
        }
        if (filters.durationMaxDays !== undefined && durationDays > filters.durationMaxDays) {
          return false;
        }
        return true;
      });
    }

    // Check if school filter was applied but user has no school
    const requiresSchool = filters.doneAtMySchool === 'true' && !user?.schoolId;

    // Normalize all editions to ensure consistent data shapes
    const normalizedEditions = filteredEditions.map(normalizeEdition);

    return NextResponse.json({
      editions: normalizedEditions,
      total: requiresSchool ? 0 : total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.ceil(total / filters.pageSize),
      requiresSchool,
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);

    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid filter parameters', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}
