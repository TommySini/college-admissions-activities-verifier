import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get all students with their activity and verification stats
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can access this endpoint' }, { status: 403 });
    }

    // Get all students
    // First, let's check what users exist in the database for debugging
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
    console.log('All users in database:', allUsers);

    const students = await prisma.user.findMany({
      where: {
        role: 'student',
      },
      include: {
        activities: {
          include: {
            verification: {
              select: {
                id: true,
                status: true,
                verifier: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`Found ${students.length} students with role "student"`);

    // Calculate stats for each student
    const studentsWithStats = students.map((student) => {
      const totalActivities = student.activities.length;
      const verifiedActivities = student.activities.filter(
        (activity) =>
          activity.verification?.status === 'verified' ||
          activity.verification?.status === 'accepted' ||
          activity.status === 'verified'
      ).length;
      const verifiedPercentage =
        totalActivities > 0 ? Math.round((verifiedActivities / totalActivities) * 100) : 0;

      // Extract grade from email or name (if available)
      // For now, we'll use a placeholder - in production, you might store grade in User model
      const grade = 'N/A'; // Could be extracted from email pattern or stored in DB

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        grade,
        totalActivities,
        verifiedActivities,
        verifiedPercentage,
        activities: student.activities.map((activity) => ({
          id: activity.id,
          name: activity.name,
          category: activity.category,
          description: activity.description,
          startDate: activity.startDate,
          endDate: activity.endDate,
          status: activity.status,
          verificationStatus: activity.verification?.status || 'pending',
          verifier: activity.verification?.verifier || null,
          createdAt: activity.createdAt,
          updatedAt: activity.updatedAt,
        })),
      };
    });

    return NextResponse.json({ students: studentsWithStats });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}
