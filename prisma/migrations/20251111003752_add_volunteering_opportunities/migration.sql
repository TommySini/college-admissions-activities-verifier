-- CreateTable
CREATE TABLE "volunteering_opportunities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "organizationId" TEXT,
    "category" TEXT NOT NULL,
    "location" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "isOngoing" BOOLEAN NOT NULL DEFAULT false,
    "hoursPerSession" REAL,
    "totalHours" REAL,
    "commitmentLevel" TEXT,
    "ageRequirement" TEXT,
    "skillsRequired" TEXT,
    "maxVolunteers" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "postedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "volunteering_opportunities_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "volunteering_opportunities_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "volunteering_opportunities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "volunteering_participations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "activityId" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "totalHours" REAL NOT NULL,
    "hoursPerWeek" REAL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "verificationNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "volunteering_participations_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "volunteering_opportunities" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "volunteering_participations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "volunteering_participations_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "volunteering_participations_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "volunteering_participations_activityId_key" ON "volunteering_participations"("activityId");
