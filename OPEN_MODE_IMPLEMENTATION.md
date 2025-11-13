# Open Mode Implementation Summary

## Overview
Implemented "open mode" to allow the AI assistant to access ALL platform data without privacy restrictions, and added a robust DB text-search fallback to ensure queries work even without embeddings.

## Changes Made

### 1. Privacy Constraints Relaxed (`lib/assistant/privacy.ts`)
- **`getPrivacyConstraints()`**: Returns `{ allowed: true }` for all models and users
- **`applyAlumniPrivacy()`**: Returns all rows without filtering
- **Note**: Original privacy logic preserved in comments for easy re-enablement later

### 2. Semantic Search Widened (`lib/retrieval/search.ts`)
- **Model filtering removed**: All models searchable regardless of user role
- **User scoping removed**: No ownerId filtering on embeddings
- **Record-level privacy disabled**: No ANONYMOUS profile filtering
- **DB text-search fallback added**: New `databaseTextSearch()` function that:
  - Searches all text fields in supported models using Prisma `contains`
  - Returns matches even when embeddings don't exist or OpenAI API is unavailable
  - Automatically triggered when semantic search returns zero results or errors

### 3. Automatic Indexing Hooks Added
New records are automatically indexed for semantic search (async, non-blocking):

- **Organizations** (`app/api/organizations/route.ts`): Index on create
- **VolunteeringOpportunity** (`app/api/volunteering-opportunities/route.ts`): Index on create
- **VolunteeringParticipation** (`app/api/volunteering-participations/route.ts`): Index on create
- **Manual volunteering logs** (`app/api/volunteering-participations/log-hours/route.ts`): Index on create
- **Activities**: Already indexed (existing implementation)
- **Alumni data**: Already indexed during parse (existing implementation)

### 4. Admin Rebuild Endpoint (`app/api/admin/rebuild-embeddings/route.ts`)
New admin-only endpoint to rebuild all embeddings:
- **POST** `/api/admin/rebuild-embeddings`
- Optional `model` parameter to rebuild specific model
- Runs asynchronously in background
- Checks for OPENAI_API_KEY availability
- Returns immediately with status message

## How It Works Now

### Query Flow
1. User asks question via assistant
2. Assistant calls `semantic_search` tool
3. **If embeddings exist**: Returns semantic matches (cosine similarity)
4. **If no embeddings or error**: Falls back to DB text search across all models
5. Results formatted and returned to user

### Data Access
- **Students**: Can now access all data (activities, organizations, opportunities, alumni applications)
- **Admins**: Same full access as before
- **No privacy filtering**: ANONYMOUS alumni profiles are visible, user-scoped data accessible to all

### Indexing
- **New records**: Automatically indexed on creation (async)
- **Existing records**: Use `/api/admin/rebuild-embeddings` endpoint or `scripts/build-embeddings.ts`
- **Works without OpenAI**: DB fallback ensures queries work even if indexing fails

## Verification

### Database Check
```bash
# Check Activity embedding (weeklytheta)
sqlite3 prisma/dev.db "SELECT content FROM embeddings WHERE modelName = 'Activity';"
# Output: "Activity: Weeklytheta\nRole: Senior Editor\nDescription: Financial literacy non-profit.\nCategory: Leadership"

# Check AlumniApplication embedding
sqlite3 prisma/dev.db "SELECT substr(content, 1, 200) FROM embeddings WHERE modelName = 'AlumniApplication';"
# Output: Shows uploaded application content

# Check all embeddings
sqlite3 prisma/dev.db "SELECT COUNT(*) as total, modelName FROM embeddings GROUP BY modelName;"
# Output: Shows counts per model type
```

### Testing Queries
The assistant can now find:
- ✅ "weeklytheta" activity by name or description ("financial literacy non-profit")
- ✅ Uploaded alumni application by any content within it
- ✅ Organizations, opportunities, and participations by text search
- ✅ Works with or without OPENAI_API_KEY

## Environment Variables
- **OPENAI_API_KEY**: Optional; embeddings use it, but DB fallback works without it
- **ALUMNI_AI_ENABLED**: Optional; controls alumni parsing, but rawText is always stored

## Re-enabling Privacy (Future)
To restore privacy constraints:
1. Remove "OPEN MODE" early returns in:
   - `lib/assistant/privacy.ts`: `getPrivacyConstraints()` and `applyAlumniPrivacy()`
   - `lib/retrieval/search.ts`: `semanticSearch()` and `applyRecordLevelPrivacy()`
2. Uncomment the original privacy logic
3. Test with different user roles

## Files Modified
- `lib/assistant/privacy.ts`
- `lib/retrieval/search.ts`
- `app/api/organizations/route.ts`
- `app/api/volunteering-opportunities/route.ts`
- `app/api/volunteering-participations/route.ts`
- `app/api/volunteering-participations/log-hours/route.ts`

## Files Created
- `app/api/admin/rebuild-embeddings/route.ts`
- `OPEN_MODE_IMPLEMENTATION.md` (this file)

## Next Steps
1. Test assistant queries in the UI
2. If needed, run rebuild: `POST /api/admin/rebuild-embeddings` (as admin)
3. Monitor server logs for indexing progress
4. Later: Re-enable privacy by removing OPEN MODE comments

