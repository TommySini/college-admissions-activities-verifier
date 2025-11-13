# Retrieval (RAG) Implementation

## Overview

This document describes the semantic search (retrieval-augmented generation) implementation for the Actify Assistant.

## Architecture

### Components

1. **Embeddings Storage** (`prisma/schema.prisma`)
   - `Embedding` model stores vector embeddings in SQLite as JSON strings
   - Normalized vectors for efficient cosine similarity computation
   - Indexed by `(modelName, recordId)` for fast lookups

2. **Embedding Utilities** (`lib/retrieval/embeddings.ts`)
   - `createTextEmbedding()`: Generate embeddings using OpenAI's `text-embedding-3-small`
   - `normalize()`: Normalize vectors to unit length
   - `cosine()`: Compute cosine similarity between vectors
   - `stripPII()`: Remove emails, phone numbers, SSNs from text

3. **Content Builder** (`lib/retrieval/buildContent.ts`)
   - `buildEmbeddableContent()`: Extract and format text from records
   - Model-specific field selection and formatting
   - Automatic PII stripping

4. **Indexer** (`lib/retrieval/indexer.ts`)
   - `upsertEmbedding()`: Index a single record
   - `indexBatch()`: Batch indexing with pagination
   - `indexModel()`: Index all records for a model
   - `deleteEmbedding()`: Remove embeddings when records are deleted

5. **Search** (`lib/retrieval/search.ts`)
   - `semanticSearch()`: Privacy-aware semantic search
   - Filters by user permissions and model access rules
   - Applies record-level privacy (e.g., alumni ANONYMOUS profiles)
   - Returns scored matches with snippets

6. **Assistant Integration** (`app/api/assistant/query/route.ts`)
   - New `semantic_search` tool for the AI assistant
   - Automatically called for fuzzy/conceptual queries
   - Results formatted for natural language synthesis

## Supported Models

The following models are indexed for semantic search:

### Alumni Data
- `AlumniApplication`: Full raw text from uploaded applications
- `ExtractedEssay`: Topics, prompts, summaries, tags
- `ExtractedActivity`: Titles, descriptions, organizations, roles
- `ExtractedAward`: Award titles, levels, descriptions
- `AdmissionResult`: College names, decisions, rounds

### Platform Data
- `Organization`: Names, descriptions, leadership info
- `VolunteeringOpportunity`: Titles, descriptions, categories

### User-Scoped Data (students see only their own)
- `Activity`: Student activities with descriptions
- `VolunteeringParticipation`: Volunteering records

## Privacy & Security

### Access Control
- **Students**: Can search their own activities/participations, approved organizations, volunteering opportunities, and non-anonymous alumni data
- **Admins**: Full access to all data

### Privacy Filtering
1. **Model-level**: Blocks access to models based on user role
2. **Owner-level**: For user-scoped models, filters by `ownerId`
3. **Record-level**: Excludes ANONYMOUS alumni profiles
4. **Content-level**: Strips PII (emails, phones, SSNs) before indexing

### Relevance Threshold
- Minimum similarity score: 0.3 (30%)
- Prevents irrelevant results from appearing

## Usage

### Backfill Embeddings

Index all existing data:
```bash
npx tsx scripts/build-embeddings.ts
```

Index a specific model:
```bash
npx tsx scripts/build-embeddings.ts --model Organization
```

### Test Semantic Search

Run test queries:
```bash
npx tsx scripts/test-semantic-search.ts
```

### Assistant Queries

The assistant automatically uses semantic search for conceptual queries:
- "Find alumni who mention robotics"
- "Show me clubs related to community service"
- "Search for essays about leadership"

For exact queries, it uses `query_model` instead:
- "Show my activities"
- "How many volunteering hours do I have?"

## Performance

### Current (SQLite + JSON)
- **Storage**: Vectors stored as JSON strings
- **Search**: In-memory cosine similarity computation
- **Suitable for**: Development, small-to-medium datasets (<10k embeddings)

### Future (PostgreSQL + pgvector)
For production scale:
1. Switch datasource to PostgreSQL
2. Change `Embedding.vector` from `String` to `Unsupported("vector")`
3. Use native vector operations for faster similarity search
4. Enable approximate nearest neighbor (ANN) indexes

The public API (`semanticSearch()`) remains unchanged.

## Cost Estimation

### Embedding Generation
- Model: `text-embedding-3-small`
- Cost: ~$0.00002 per 1,000 tokens
- Average record: ~200 tokens = $0.000004 per record

### Example Costs
- 1,000 records: ~$0.004
- 10,000 records: ~$0.04
- 100,000 records: ~$0.40

### Query Costs
- Each search query generates 1 embedding
- Cost per query: ~$0.000004

## Maintenance

### Keeping Embeddings Up-to-Date

**Option 1: Periodic Backfill**
```bash
# Run daily/weekly via cron
npx tsx scripts/build-embeddings.ts
```

**Option 2: Real-time Indexing** (recommended for production)
Add hooks to your API routes:
```typescript
import { upsertEmbedding } from "@/lib/retrieval/indexer";

// After creating/updating a record
await upsertEmbedding("Organization", organization.id);

// After deleting a record
await deleteEmbedding("Organization", organizationId);
```

## Troubleshooting

### No Results Found
- Check if embeddings exist: `SELECT COUNT(*) FROM embeddings;`
- Verify OpenAI API key is set
- Lower the similarity threshold in `search.ts` (currently 0.3)

### Slow Queries
- For SQLite: Limit the number of models searched
- For large datasets: Migrate to PostgreSQL + pgvector

### Privacy Violations
- Review `getPrivacyConstraints()` in `lib/assistant/privacy.ts`
- Check `applyRecordLevelPrivacy()` in `lib/retrieval/search.ts`
- Verify PII stripping in `stripPII()` function

## Future Enhancements

1. **Hybrid Search**: Combine semantic search with keyword matching
2. **Reranking**: Use a cross-encoder for more accurate top results
3. **Caching**: Cache query embeddings for common questions
4. **Analytics**: Track which queries use semantic search vs. structured queries
5. **User Feedback**: Allow users to rate search result relevance

