import { prisma } from '@/lib/prisma';
import { createTextEmbedding, normalize, encodeVector } from './embeddings';
import { buildEmbeddableContent, isModelSupported } from './buildContent';

/**
 * Upsert an embedding for a single record
 */
export async function upsertEmbedding(modelName: string, recordId: string): Promise<boolean> {
  try {
    if (!isModelSupported(modelName)) {
      console.warn(`[upsertEmbedding] Model ${modelName} not supported`);
      return false;
    }

    // Fetch the record from the appropriate model
    const prismaModel = (prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];

    if (!prismaModel) {
      console.error(`[upsertEmbedding] Prisma model ${modelName} not found`);
      return false;
    }

    const record = await prismaModel.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      console.warn(`[upsertEmbedding] Record ${recordId} not found in ${modelName}`);
      return false;
    }

    // Build embeddable content
    const embeddableContent = buildEmbeddableContent(modelName, record);

    if (!embeddableContent || !embeddableContent.content) {
      console.warn(`[upsertEmbedding] No content to embed for ${modelName}:${recordId}`);
      return false;
    }

    // Create embedding
    const rawVector = await createTextEmbedding(embeddableContent.content);
    const normalizedVector = normalize(rawVector);
    const vectorJson = encodeVector(normalizedVector);

    // Upsert to database
    await prisma.embedding.upsert({
      where: {
        modelName_recordId: {
          modelName,
          recordId,
        },
      },
      update: {
        content: embeddableContent.content,
        vector: vectorJson,
        ownerId: embeddableContent.ownerId || null,
        updatedAt: new Date(),
      },
      create: {
        modelName,
        recordId,
        content: embeddableContent.content,
        vector: vectorJson,
        ownerId: embeddableContent.ownerId || null,
      },
    });

    console.log(`[upsertEmbedding] ✓ Indexed ${modelName}:${recordId}`);
    return true;
  } catch (error) {
    console.error(`[upsertEmbedding] Error indexing ${modelName}:${recordId}:`, error);
    return false;
  }
}

/**
 * Index a batch of records for a given model
 */
export async function indexBatch(
  modelName: string,
  options?: {
    where?: any;
    limit?: number;
    cursor?: string;
  }
): Promise<{ indexed: number; failed: number; cursor?: string }> {
  try {
    if (!isModelSupported(modelName)) {
      console.warn(`[indexBatch] Model ${modelName} not supported`);
      return { indexed: 0, failed: 0 };
    }

    const prismaModel = (prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];

    if (!prismaModel) {
      console.error(`[indexBatch] Prisma model ${modelName} not found`);
      return { indexed: 0, failed: 0 };
    }

    const limit = options?.limit || 50;
    const where = options?.where || {};

    // Fetch records
    const queryOptions: any = {
      where,
      take: limit,
      orderBy: { id: 'asc' },
    };

    if (options?.cursor) {
      queryOptions.cursor = { id: options.cursor };
      queryOptions.skip = 1; // Skip the cursor itself
    }

    const records = await prismaModel.findMany(queryOptions);

    if (records.length === 0) {
      return { indexed: 0, failed: 0 };
    }

    console.log(`[indexBatch] Processing ${records.length} records from ${modelName}`);

    let indexed = 0;
    let failed = 0;

    // Process records sequentially to avoid rate limits
    for (const record of records) {
      const success = await upsertEmbedding(modelName, record.id);
      if (success) {
        indexed++;
      } else {
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const lastRecord = records[records.length - 1];
    const nextCursor = records.length === limit ? lastRecord.id : undefined;

    return { indexed, failed, cursor: nextCursor };
  } catch (error) {
    console.error(`[indexBatch] Error processing batch for ${modelName}:`, error);
    return { indexed: 0, failed: 0 };
  }
}

/**
 * Index all records for a given model (with pagination)
 */
export async function indexModel(modelName: string): Promise<{
  totalIndexed: number;
  totalFailed: number;
}> {
  console.log(`[indexModel] Starting indexing for ${modelName}`);

  let totalIndexed = 0;
  let totalFailed = 0;
  let cursor: string | undefined = undefined;

  while (true) {
    const result = await indexBatch(modelName, { cursor, limit: 50 });

    totalIndexed += result.indexed;
    totalFailed += result.failed;

    console.log(`[indexModel] ${modelName}: ${totalIndexed} indexed, ${totalFailed} failed`);

    if (!result.cursor) {
      // No more records
      break;
    }

    cursor = result.cursor;
  }

  console.log(
    `[indexModel] ✓ Completed ${modelName}: ${totalIndexed} indexed, ${totalFailed} failed`
  );

  return { totalIndexed, totalFailed };
}

/**
 * Delete embedding for a record (useful when record is deleted)
 */
export async function deleteEmbedding(modelName: string, recordId: string): Promise<boolean> {
  try {
    await prisma.embedding.delete({
      where: {
        modelName_recordId: {
          modelName,
          recordId,
        },
      },
    });

    console.log(`[deleteEmbedding] ✓ Deleted ${modelName}:${recordId}`);
    return true;
  } catch (error) {
    // Ignore if not found
    if ((error as any)?.code === 'P2025') {
      return true;
    }
    console.error(`[deleteEmbedding] Error deleting ${modelName}:${recordId}:`, error);
    return false;
  }
}
