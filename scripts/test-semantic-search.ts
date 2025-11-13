/**
 * Test script for semantic search functionality
 * 
 * Usage:
 *   npx tsx scripts/test-semantic-search.ts
 */

import { semanticSearch } from "@/lib/retrieval/search";
import { prisma } from "@/lib/prisma";

async function main() {
  console.log("=== Semantic Search Test ===\n");

  // Get a test user (admin for full access)
  const testUser = await prisma.user.findFirst({
    where: { role: "admin" },
  });

  if (!testUser) {
    console.error("❌ No admin user found in database");
    console.log("Please create a user first by signing in to the app");
    process.exit(1);
  }

  console.log(`Testing as: ${testUser.name} (${testUser.role})\n`);

  // Test queries
  const testQueries = [
    {
      name: "Search for computer science activities",
      query: "computer science programming coding",
      models: ["ExtractedActivity"],
    },
    {
      name: "Search for leadership essays",
      query: "leadership team management",
      models: ["ExtractedEssay"],
    },
    {
      name: "Search for finance-related content",
      query: "finance business economics investment",
      models: undefined, // Search all models
    },
    {
      name: "Search for Stanford admissions",
      query: "Stanford University admission",
      models: ["AdmissionResult"],
    },
    {
      name: "Search for community service organizations",
      query: "community service volunteer helping others",
      models: ["Organization"],
    },
  ];

  for (const test of testQueries) {
    console.log(`\n--- ${test.name} ---`);
    console.log(`Query: "${test.query}"`);
    console.log(`Models: ${test.models ? test.models.join(", ") : "all"}`);

    try {
      const result = await semanticSearch({
        query: test.query,
        models: test.models,
        user: testUser,
        topK: 5,
      });

      console.log(`\nResults: ${result.matches.length} matches (from ${result.totalCandidates} candidates)`);

      if (result.matches.length > 0) {
        result.matches.forEach((match, index) => {
          console.log(`\n${index + 1}. ${match.modelName} (score: ${(match.score * 100).toFixed(1)}%)`);
          console.log(`   ID: ${match.recordId}`);
          console.log(`   Snippet: ${match.snippet.slice(0, 150)}...`);
        });
      } else {
        console.log("   No matches found");
      }
    } catch (error) {
      console.error(`❌ Error:`, error);
    }
  }

  console.log("\n\n=== Test Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

