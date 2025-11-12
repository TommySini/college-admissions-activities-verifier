# Alumni Database Testing Guide

## Manual Testing Checklist

### 1. Setup
- [ ] Verify `.env` has `ALUMNI_AI_ENABLED=true` and `OPENAI_API_KEY` (optional for testing without AI)
- [ ] Run `npm run dev` to start the development server
- [ ] Navigate to http://localhost:3000

### 2. Profile Creation & Privacy Settings
- [ ] Navigate to `/alumni/upload`
- [ ] Test ANONYMOUS privacy setting
  - Select "Anonymous"
  - Fill in major and career tags
  - Verify name/email fields are hidden
  - Click "Next: Upload File"
- [ ] Go back and test PSEUDONYM privacy
  - Select "Pseudonym"
  - Enter a display name
  - Verify contact email is hidden
  - Click "Next: Upload File"
- [ ] Go back and test FULL privacy
  - Select "Full Profile"
  - Enter display name and contact email
  - Click "Next: Upload File"

### 3. File Upload
- [ ] Create a test admissions document (PDF or TXT) with sample content:
  ```
  ACTIVITIES:
  - President of Robotics Club (9-12 grade, 10 hours/week)
  - Volunteer at Local Hospital (11-12 grade, 5 hours/week)
  
  ESSAYS:
  - Common App Essay: Overcoming challenges in STEM
  - Supplemental Essay: Why Computer Science?
  
  ADMISSION RESULTS:
  - Stanford University: Admitted (REA)
  - MIT: Waitlisted
  - UC Berkeley: Admitted (RD)
  
  INTENDED MAJOR: Computer Science
  CAREER INTERESTS: Technology, Artificial Intelligence
  ```
- [ ] Upload the test file
- [ ] Verify file size validation (try uploading >10MB file)
- [ ] Verify file type validation (try uploading unsupported format)
- [ ] Successful upload should show "Processing" step

### 4. Parsing & AI Extraction
- [ ] Wait for parsing to complete (or timeout after 30 seconds)
- [ ] If `OPENAI_API_KEY` is set:
  - Verify activities are extracted
  - Verify essays are extracted
  - Verify admission results are extracted with rank buckets
- [ ] If AI is disabled:
  - Verify application is created but extraction is empty
  - Can manually trigger parse via `/api/alumni/applications/{id}/parse`

### 5. Browse Alumni Database
- [ ] Navigate to `/alumni`
- [ ] Verify uploaded application appears in the grid
- [ ] Test filters:
  - [ ] Search by major
  - [ ] Filter by career tags
  - [ ] Filter by "Top 5" rank bucket
  - [ ] Filter by "admit" decision
  - [ ] Clear all filters
- [ ] Verify privacy badges display correctly
- [ ] Verify Folder component displays on each card
- [ ] Click on a profile card

### 6. Application Detail View
- [ ] Verify Folder component displays at top
- [ ] Click folder to open/close papers
- [ ] Verify privacy-filtered information:
  - ANONYMOUS: No name or email
  - PSEUDONYM: Display name shown, no email
  - FULL: Both name and email shown
- [ ] Verify admission results section shows:
  - College names
  - Decision badges (admit/waitlist/deny)
  - Rank bucket badges (Top 5/Top 10)
  - Decision round (ED/EA/RD)
- [ ] Verify activities section displays extracted data
- [ ] Verify essays section displays topics and summaries
- [ ] Test navigation back to browse page

### 7. API Endpoints Testing

#### GET /api/alumni/profiles
```bash
curl http://localhost:3000/api/alumni/profiles
curl "http://localhost:3000/api/alumni/profiles?major=Computer%20Science"
curl "http://localhost:3000/api/alumni/profiles?rankBucket=top5&decision=admit"
```

#### POST /api/alumni/profiles
```bash
curl -X POST http://localhost:3000/api/alumni/profiles \
  -H "Content-Type: application/json" \
  -d '{"privacy":"PSEUDONYM","displayName":"Test Alumni","intendedMajor":"CS","careerInterestTags":["tech"]}'
```

#### GET /api/alumni/applications/{id}
```bash
curl http://localhost:3000/api/alumni/applications/{APPLICATION_ID}
```

#### POST /api/alumni/applications/{id}/parse
```bash
curl -X POST http://localhost:3000/api/alumni/applications/{APPLICATION_ID}/parse
```

### 8. Edge Cases
- [ ] Upload without creating profile first (should auto-create)
- [ ] Upload multiple applications for same user
- [ ] Test with very large text file (near 10MB limit)
- [ ] Test with corrupted/invalid PDF
- [ ] Test parsing timeout (>30 seconds)
- [ ] Test with empty/minimal admissions document
- [ ] Test rank bucketing with various college names:
  - "Harvard University" → top5
  - "MIT" → top5
  - "Duke University" → top10
  - "Random State University" → other

### 9. Navigation & Integration
- [ ] Verify "Alumni Database" link appears in main navigation
- [ ] Test navigation flow:
  - Dashboard → Alumni → Upload → Detail → Browse
- [ ] Verify back buttons work correctly
- [ ] Test deep linking (direct URL access to detail pages)

### 10. Responsive Design
- [ ] Test on mobile viewport (375px width)
- [ ] Test on tablet viewport (768px width)
- [ ] Test on desktop viewport (1440px width)
- [ ] Verify Folder component scales appropriately
- [ ] Verify filter layout adapts to screen size

## Known Limitations
- AI parsing requires valid `OPENAI_API_KEY`
- Parsing is synchronous and may timeout for very large files
- SQLite full-text search is limited (use `contains` for tags)
- File storage is local to `public/uploads/alumni/`
- No pagination implemented for large result sets

## Troubleshooting
- **Parse fails**: Check `OPENAI_API_KEY` and `ALUMNI_AI_ENABLED` in `.env`
- **Upload fails**: Check file permissions on `public/uploads/alumni/`
- **Empty results**: Verify Prisma migrations ran successfully
- **404 on detail page**: Check application ID exists in database

