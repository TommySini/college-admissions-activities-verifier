import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { indexModel } from '@/lib/retrieval/indexer';
import { getSupportedModels } from '@/lib/retrieval/buildContent';

/**
 * POST /api/admin/rebuild-embeddings
 * Rebuild all embeddings for supported models (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: 'OPENAI_API_KEY not configured',
          message: 'Embeddings require OpenAI API key to be set in environment variables',
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const specificModel = body.model;

    let modelsToIndex: string[];

    if (specificModel) {
      const supported = getSupportedModels();
      if (!supported.includes(specificModel)) {
        return NextResponse.json(
          {
            error: `Model "${specificModel}" is not supported`,
            supportedModels: supported,
          },
          { status: 400 }
        );
      }
      modelsToIndex = [specificModel];
    } else {
      modelsToIndex = getSupportedModels();
    }

    console.log(
      `[POST /api/admin/rebuild-embeddings] Starting rebuild for: ${modelsToIndex.join(', ')}`
    );

    // Start indexing asynchronously (don't block the response)
    const indexingPromise = (async () => {
      const results: Record<string, { indexed: number; failed: number }> = {};

      for (const modelName of modelsToIndex) {
        try {
          console.log(`[rebuild-embeddings] Processing ${modelName}...`);
          const result = await indexModel(modelName);
          results[modelName] = {
            indexed: result.totalIndexed,
            failed: result.totalFailed,
          };
          console.log(
            `[rebuild-embeddings] ✓ ${modelName}: ${result.totalIndexed} indexed, ${result.totalFailed} failed`
          );
        } catch (error) {
          console.error(`[rebuild-embeddings] Error indexing ${modelName}:`, error);
          results[modelName] = { indexed: 0, failed: -1 };
        }
      }

      console.log(`[rebuild-embeddings] Completed rebuild:`, results);
      return results;
    })();

    // Don't await - let it run in background
    indexingPromise.catch((error) => {
      console.error('[rebuild-embeddings] Fatal error during rebuild:', error);
    });

    return NextResponse.json({
      message: 'Embedding rebuild started',
      models: modelsToIndex,
      note: 'Indexing is running in the background. Check server logs for progress.',
    });
  } catch (error) {
    console.error('[POST /api/admin/rebuild-embeddings] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start rebuild' },
      { status: 500 }
    );
  }
}
