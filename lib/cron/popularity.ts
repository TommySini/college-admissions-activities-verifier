/**
 * Popularity Scoring Cron Job
 * Runs nightly to recompute popularity scores for editions
 * 
 * To run manually: node -r ts-node/register lib/cron/popularity.ts
 * In production: Set up with Vercel Cron, Railway Cron, or pg_cron
 */

import { prisma } from "@/lib/prisma";

export async function recomputePopularity() {
  console.log("[Cron] Starting popularity recomputation...");
  
  try {
    // Get all editions
    const editions = await prisma.edition.findMany({
      select: {
        id: true,
        savesCount: true,
        followsCount: true,
        clicks30d: true,
        createdAt: true,
      },
    });
    
    console.log(`[Cron] Processing ${editions.length} editions...`);
    
    // Compute popularity score for each edition
    const updates = editions.map((edition) => {
      // Weighted formula (adjust weights as needed)
      const SAVE_WEIGHT = 3;
      const FOLLOW_WEIGHT = 2;
      const CLICK_WEIGHT = 0.1;
      const RECENCY_MULTIPLIER = 1.2; // Boost newer opportunities
      
      // Base score
      let score = 
        (edition.savesCount * SAVE_WEIGHT) +
        (edition.followsCount * FOLLOW_WEIGHT) +
        (edition.clicks30d * CLICK_WEIGHT);
      
      // Apply recency boost for editions created in last 90 days
      const daysSinceCreation = Math.floor(
        (Date.now() - edition.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceCreation < 90) {
        score *= RECENCY_MULTIPLIER;
      }
      
      // Apply exponential decay for very old editions
      if (daysSinceCreation > 365) {
        score *= 0.5;
      }
      
      return prisma.edition.update({
        where: { id: edition.id },
        data: {
          popularityScore: Math.round(score),
        },
      });
    });
    
    // Execute all updates in batches of 100
    const batchSize = 100;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      await Promise.all(batch);
      console.log(`[Cron] Updated ${Math.min(i + batchSize, updates.length)}/${updates.length} editions`);
    }
    
    // Reset clicks30d for editions that haven't been clicked recently
    // (This would normally track a 30-day rolling window in production)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log("[Cron] Popularity recomputation completed successfully");
    return { success: true, updated: editions.length };
  } catch (error) {
    console.error("[Cron] Error recomputing popularity:", error);
    throw error;
  }
}

// If running directly (not imported)
if (require.main === module) {
  recomputePopularity()
    .then((result) => {
      console.log("Result:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed:", error);
      process.exit(1);
    });
}

