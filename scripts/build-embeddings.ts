/**
 * Backfill script to build embeddings for all supported models
 * 
 * Usage:
 *   npx tsx scripts/build-embeddings.ts
 *   npx tsx scripts/build-embeddings.ts --model Organization
 */

import { indexModel } from "@/lib/retrieval/indexer";
import { getSupportedModels } from "@/lib/retrieval/buildContent";

async function main() {
  const args = process.argv.slice(2);
  const modelFlag = args.indexOf("--model");
  const specificModel = modelFlag !== -1 ? args[modelFlag + 1] : null;

  console.log("=== Embedding Backfill Script ===\n");

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY not set in environment");
    process.exit(1);
  }

  let modelsToIndex: string[];

  if (specificModel) {
    const supported = getSupportedModels();
    if (!supported.includes(specificModel)) {
      console.error(`❌ Model "${specificModel}" is not supported`);
      console.log(`Supported models: ${supported.join(", ")}`);
      process.exit(1);
    }
    modelsToIndex = [specificModel];
    console.log(`Indexing specific model: ${specificModel}\n`);
  } else {
    modelsToIndex = getSupportedModels();
    console.log(`Indexing all supported models: ${modelsToIndex.join(", ")}\n`);
  }

  const startTime = Date.now();
  let totalIndexed = 0;
  let totalFailed = 0;

  for (const modelName of modelsToIndex) {
    console.log(`\n--- Processing ${modelName} ---`);
    
    try {
      const result = await indexModel(modelName);
      totalIndexed += result.totalIndexed;
      totalFailed += result.totalFailed;
      
      console.log(
        `✓ ${modelName}: ${result.totalIndexed} indexed, ${result.totalFailed} failed`
      );
    } catch (error) {
      console.error(`❌ Error indexing ${modelName}:`, error);
      totalFailed++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n=== Summary ===");
  console.log(`Total indexed: ${totalIndexed}`);
  console.log(`Total failed: ${totalFailed}`);
  console.log(`Duration: ${duration}s`);
  console.log("\n✓ Backfill complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

