# Volunteering Opportunities Feature - Implementation Plan

## Overview
A comprehensive volunteering opportunities database that allows students to discover, log, and track community service activities, with automatic PDF generation for verification.

---

## Phase 1: Database Schema

### New Models to Add

#### 1. `VolunteeringOpportunity`
```prisma
model VolunteeringOpportunity {
  id              String   @id @default(cuid())
  title           String
  description     String
  organization    String   // Organization name
  organizationId  String?  // Optional link to Organization model
  category        String   // e.g., "Environment", "Education", "Healthcare", etc.
  location        String?  // City, address, or "Remote"
  contactEmail    String?
  contactPhone    String?
  website         String?
  
  // Time & Commitment
  startDate       DateTime
  endDate         DateTime?
  isOngoing       Boolean  @default(false)
  hoursPerSession Float?
  totalHours     Float?
  commitmentLevel String?  // "Low", "Medium", "High"
  
  // Requirements
  ageRequirement  String?  // e.g., "16+", "18+"
  skillsRequired  String?  // Comma-separated or JSON
  maxVolunteers   Int?
  
  // Status & Approval
  status          String   @default("pending") // "pending", "approved", "rejected", "archived"
  postedById      String   // User who posted (student, club, admin)
  approvedById    String?  // Admin who approved
  
  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  postedBy        User     @relation("OpportunityPoster", fields: [postedById], references: [id])
  approvedBy      User?    @relation("OpportunityApprover", fields: [approvedById], references: [id])
  organizationRef Organization? @relation(fields: [organizationId], references: [id])
  participations  VolunteeringParticipation[]
  
  @@map("volunteering_opportunities")
}
```

#### 2. `VolunteeringParticipation`
```prisma
model VolunteeringParticipation {
  id                String   @id @default(cuid())
  opportunityId     String
  studentId         String
  activityId        String?  // Link to Activity model (if logged as activity)
  
  // Participation Details
  startDate         DateTime
  endDate           DateTime?
  totalHours        Float
  hoursPerWeek      Float?
  status            String   @default("active") // "active", "completed", "cancelled"
  
  // Verification
  verified          Boolean  @default(false)
  verifiedBy        String?  // User ID of verifier
  verifiedAt        DateTime?
  verificationNotes String?
  
  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  opportunity       VolunteeringOpportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  student           User     @relation("StudentParticipations", fields: [studentId], references: [id], onDelete: Cascade)
  activity          Activity? @relation(fields: [activityId], references: [id], onDelete: SetNull)
  verifier          User?    @relation("ParticipationVerifier", fields: [verifiedBy], references: [id])
  
  @@map("volunteering_participations")
}
```

### Updates to Existing Models

#### User Model
```prisma
// Add relations:
opportunitiesPosted    VolunteeringOpportunity[] @relation("OpportunityPoster")
opportunitiesApproved  VolunteeringOpportunity[] @relation("OpportunityApprover")
participations         VolunteeringParticipation[] @relation("StudentParticipations")
verifiedParticipations VolunteeringParticipation[] @relation("ParticipationVerifier")
```

#### Activity Model
```prisma
// Add relation:
volunteeringParticipation VolunteeringParticipation?
```

#### Organization Model
```prisma
// Add relation:
volunteeringOpportunities VolunteeringOpportunity[]
```

---

## Phase 2: API Routes

### `/app/api/volunteering-opportunities/route.ts`
- **GET**: List opportunities with filtering (status, category, location, date range)
- **POST**: Create new opportunity (requires authentication)

### `/app/api/volunteering-opportunities/[id]/route.ts`
- **GET**: Get single opportunity details
- **PATCH**: Update opportunity (poster or admin only)
- **DELETE**: Delete opportunity (poster or admin only)

### `/app/api/volunteering-opportunities/[id]/approve/route.ts`
- **POST**: Approve opportunity (admin only)

### `/app/api/volunteering-opportunities/[id]/reject/route.ts`
- **POST**: Reject opportunity (admin only)

### `/app/api/volunteering-participations/route.ts`
- **GET**: List participations (filtered by student, opportunity, status)
- **POST**: Create new participation (link student to opportunity)

### `/app/api/volunteering-participations/[id]/route.ts`
- **GET**: Get single participation
- **PATCH**: Update participation (hours, dates, status)
- **DELETE**: Delete participation

### `/app/api/volunteering-participations/[id]/verify/route.ts`
- **POST**: Verify participation (admin/verifier only)

### `/app/api/volunteering-participations/[id]/generate-pdf/route.ts`
- **GET**: Generate PDF community service form for participation

---

## Phase 3: UI Components & Pages

### Main Pages

#### 1. `/app/volunteering/page.tsx` - Opportunities Browse Page
**Features:**
- Search bar (title, description, organization)
- Filter sidebar:
  - Category
  - Location
  - Date range
  - Commitment level
  - Age requirement
- Grid/list view toggle
- Sort options (newest, most popular, ending soon)
- Opportunity cards showing:
  - Title, organization, category
  - Location, dates
  - Brief description
  - "View Details" button
  - "Sign Up" button (if student)

#### 2. `/app/volunteering/[id]/page.tsx` - Opportunity Detail Page
**Features:**
- Full opportunity details
- "Sign Up" / "Already Participating" button
- List of current participants (if public)
- Map/location info (if available)
- Contact information
- Related opportunities section

#### 3. `/app/volunteering/my-opportunities/page.tsx` - Student's Participations
**Features:**
- List of opportunities student is participating in
- Status indicators (active, completed, pending verification)
- Hours logged
- "Log Hours" button
- "Generate PDF" button for verified participations
- "View Activity" link (if linked to Activity)

#### 4. `/app/volunteering/post/page.tsx` - Post New Opportunity
**Features:**
- Form to create new opportunity
- All fields from schema
- Preview before submitting
- Status: "pending" until admin approval

#### 5. `/app/volunteering/admin/page.tsx` - Admin Approval Queue
**Features:**
- List of pending opportunities
- Approve/Reject actions
- Edit before approval
- Bulk actions

### Components

#### 1. `OpportunityCard.tsx`
- Reusable card component for opportunity display
- Used in browse page and search results

#### 2. `OpportunityFilters.tsx`
- Filter sidebar component
- Collapsible sections
- Clear filters button

#### 3. `ParticipationCard.tsx`
- Display student's participation
- Show hours, dates, status
- Actions: log hours, generate PDF, view details

#### 4. `LogHoursForm.tsx`
- Modal/form to log hours for participation
- Date picker, hours input
- Notes field

#### 5. `PDFGenerator.tsx`
- Component/service to generate community service PDF
- Uses jsPDF (already in dependencies)
- Includes:
  - Student name, email
  - Opportunity details
  - Hours logged
  - Dates
  - Supervisor/verifier signature line
  - School logo/header (if applicable)

#### 6. `OpportunityForm.tsx`
- Form for creating/editing opportunities
- Validation
- Rich text editor for description (optional)

---

## Phase 4: Integration Points

### With Existing Activity System
1. **Link Participation to Activity**: When student logs participation, optionally create/link to Activity
2. **Auto-populate Activity Form**: Pre-fill activity form from participation data
3. **Verification Sync**: If participation is verified, mark linked activity as verified

### With Organization System
1. **Club Opportunities**: Approved organizations can post opportunities
2. **Organization Badge**: Show organization name/logo on opportunity cards
3. **Organization Dashboard**: Show opportunities posted by organization

### With Dashboard
1. **Quick Stats**: Add volunteering stats to student dashboard
2. **Recent Opportunities**: Show recently posted opportunities
3. **Upcoming Deadlines**: Show opportunities ending soon

### Navigation Updates
- Add "Volunteering" link to main navigation
- Add to student dashboard sidebar
- Add to admin panel

---

## Phase 5: User Workflows

### Student Workflow
1. **Discover**: Browse/search opportunities → View details → Sign up
2. **Participate**: Log hours → Track progress → Complete participation
3. **Verify**: Request verification → Generate PDF → Download signed form
4. **Track**: View all participations → See total hours → Export summary

### Poster Workflow (Student/Club/Admin)
1. **Post**: Fill form → Submit → Wait for approval
2. **Manage**: Edit details → View participants → Archive when done

### Admin Workflow
1. **Moderate**: Review pending → Approve/Reject → Edit if needed
2. **Verify**: Review participation hours → Verify → Sign PDFs
3. **Analytics**: View participation stats → Export reports

---

## Phase 6: Implementation Order

### Step 1: Database & Schema ✅
- Add Prisma models
- Create migration
- Update types

### Step 2: Basic API Routes
- CRUD for opportunities
- CRUD for participations
- Approval endpoints

### Step 3: Browse Page
- List opportunities
- Basic search
- Simple filters

### Step 4: Detail & Sign Up
- Opportunity detail page
- Sign up functionality
- Participation creation

### Step 5: Student Dashboard
- My participations page
- Log hours functionality
- Status tracking

### Step 6: Post Opportunity
- Create form
- Admin approval queue
- Edit functionality

### Step 7: PDF Generation
- PDF template
- Generate endpoint
- Download functionality

### Step 8: Advanced Features
- Advanced filters
- Search improvements
- Notifications
- Analytics

---

## Phase 7: Technical Considerations

### Filtering & Search
- Use Prisma query filters
- Consider full-text search for large datasets
- Cache popular searches

### PDF Generation
- Use jsPDF + jsPDF-autotable (already installed)
- Template design for school requirements
- Digital signature support (future)

### Performance
- Pagination for opportunity lists
- Lazy loading for images
- Optimize database queries with includes

### Security
- Role-based access control
- Validate all inputs
- Rate limiting on API routes
- Sanitize user-generated content

### Data Validation
- Validate dates (end > start)
- Validate hours (positive numbers)
- Validate email/phone formats
- Required field validation

---

## Phase 8: Future Enhancements (Post-MVP)

1. **Notifications**: Email alerts for new opportunities, verification requests
2. **Recommendations**: Suggest opportunities based on student interests
3. **Social Features**: See friends' participations, share opportunities
4. **Calendar Integration**: Add opportunities to calendar
5. **Mobile App**: React Native version
6. **Analytics Dashboard**: For admins to track engagement
7. **Badges/Achievements**: Gamification for volunteering
8. **Multi-language Support**: If needed

---

## Questions to Resolve

1. **Approval Workflow**: Auto-approve for admins/clubs, or always require admin approval?
2. **PDF Format**: School-specific template or generic community service form?
3. **Verification**: Who can verify? (Admin only, or also opportunity poster?)
4. **Privacy**: Show participant names publicly or keep private?
5. **Hours Tracking**: Manual entry only, or also time-tracking integration?
6. **Categories**: Use existing Activity categories or create new volunteering-specific ones?

---

## Estimated Timeline

- **Phase 1-2** (Database + API): 2-3 days
- **Phase 3** (UI Components): 3-4 days
- **Phase 4** (Integration): 1-2 days
- **Phase 5-6** (Workflows + Polish): 2-3 days
- **Testing & Bug Fixes**: 1-2 days

**Total: ~10-14 days** for full MVP

---

## Next Steps

1. Review and approve this plan
2. Resolve open questions
3. Start with Phase 1: Database schema
4. Iterate based on feedback

