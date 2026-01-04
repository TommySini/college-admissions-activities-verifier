import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// AI verification endpoint (behind feature flag)
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if AI verify feature is enabled
    if (process.env.FEATURE_AI_VERIFY !== 'true') {
      return NextResponse.json(
        { error: 'AI verification feature is not enabled' },
        { status: 403 }
      );
    }

    const params = await context.params;
    const { id } = params;

    const petition = await prisma.petition.findUnique({
      where: { id },
    });

    if (!petition) {
      return NextResponse.json({ error: 'Petition not found' }, { status: 404 });
    }

    // Fetch the URL and extract information
    // This is a placeholder - in production, you'd use an AI service or web scraping
    try {
      const response = await fetch(petition.url, {
        headers: {
          'User-Agent': 'Actify-Bot/1.0',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch URL');
      }

      const html = await response.text();

      // Mock AI extraction (replace with actual AI service like OpenAI, Anthropic, etc.)
      const extracted = {
        name: petition.title,
        type: 'program',
        modality: 'online',
        structure: 'either',
        geography: 'global',
        description: petition.description || 'Extracted from website',
        confidence: 0.75, // Mock confidence score
        // In production, use AI to extract:
        // - deadlines, dates, location, eligibility, awards, etc.
      };

      // Store AI extraction results
      await prisma.petition.update({
        where: { id },
        data: {
          aiExtracted: extracted,
          aiConfidence: extracted.confidence,
        },
      });

      return NextResponse.json({
        extracted,
        confidence: extracted.confidence,
        message: 'AI extraction completed successfully',
      });
    } catch (error) {
      console.error('Error extracting data from URL:', error);
      return NextResponse.json({ error: 'Failed to extract data from URL' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in AI verification:', error);
    return NextResponse.json({ error: 'Failed to verify petition' }, { status: 500 });
  }
}
