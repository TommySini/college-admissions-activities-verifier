import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { upsertEmbedding } from '@/lib/retrieval/indexer';

// Cache public listings for 2 minutes
export const revalidate = 120;

// GET - List volunteering opportunities with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const categories = searchParams.get('categories'); // Comma-separated list
    const location = searchParams.get('location');
    const isOnline = searchParams.get('isOnline');
    const search = searchParams.get('search');
    const postedBy = searchParams.get('postedBy');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};

    // Filter by status (default to approved if not admin)
    const user = await getCurrentUser();
    if (status) {
      where.status = status;
    } else if (!user || user.role !== 'admin') {
      // Non-admins only see approved opportunities
      where.status = 'approved';
    }

    // Filter by category (single or multiple)
    if (categories) {
      const categoryList = categories.split(',').filter(Boolean);
      if (categoryList.length > 0) {
        where.category = { in: categoryList };
      }
    } else if (category) {
      where.category = category;
    }

    // Filter by location
    if (location) {
      where.location = {
        contains: location,
      };
    }

    // Filter by online status
    if (isOnline !== null && isOnline !== undefined) {
      where.isOnline = isOnline === 'true';
    }

    // Search in title, description, organization
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { organization: { contains: search } },
      ];
    }

    // Filter by poster
    if (postedBy) {
      where.postedById = postedBy;
    }

    const opportunities = await prisma.volunteeringOpportunity.findMany({
      where,
      include: {
        postedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        organizationRef: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            participations: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.volunteeringOpportunity.count({ where });

    return NextResponse.json({
      opportunities,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching volunteering opportunities:', error);
    console.error('Error details:', error.message, error.stack);
    return NextResponse.json(
      { error: 'Failed to fetch volunteering opportunities', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new volunteering opportunity
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      organization,
      organizationId,
      category,
      location,
      isOnline,
      contactEmail,
      contactPhone,
      website,
      startDate,
      endDate,
      isOngoing,
      hoursPerSession,
      totalHours,
      commitmentLevel,
      ageRequirement,
      skillsRequired,
      maxVolunteers,
    } = body;

    // Validate required fields
    if (!title || !description || !organization || !category || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, organization, category, startDate' },
        { status: 400 }
      );
    }

    // Determine status based on user role
    let status = 'pending';
    let approvedById = null;
    if (user.role === 'admin') {
      status = 'approved';
      approvedById = user.id;
    }

    const opportunity = await prisma.volunteeringOpportunity.create({
      data: {
        title,
        description,
        organization,
        organizationId: organizationId || null,
        category,
        location: location || null,
        isOnline: isOnline || false,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        website: website || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isOngoing: isOngoing || false,
        hoursPerSession: hoursPerSession ? parseFloat(hoursPerSession) : null,
        totalHours: totalHours ? parseFloat(totalHours) : null,
        commitmentLevel: commitmentLevel || null,
        ageRequirement: ageRequirement || null,
        skillsRequired: skillsRequired || null,
        maxVolunteers: maxVolunteers ? parseInt(maxVolunteers) : null,
        status,
        postedById: user.id,
        approvedById,
      },
      include: {
        postedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        organizationRef: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    // Index opportunity for semantic search (async, don't await)
    upsertEmbedding('VolunteeringOpportunity', opportunity.id).catch((error) => {
      console.error(
        `[POST /api/volunteering-opportunities] Failed to index opportunity ${opportunity.id}:`,
        error
      );
    });

    return NextResponse.json({ opportunity }, { status: 201 });
  } catch (error) {
    console.error('Error creating volunteering opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to create volunteering opportunity' },
      { status: 500 }
    );
  }
}
