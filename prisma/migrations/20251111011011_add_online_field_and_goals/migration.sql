-- CreateTable
CREATE TABLE "volunteering_goals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "goalType" TEXT NOT NULL DEFAULT 'personal',
    "targetHours" REAL NOT NULL,
    "targetDate" DATETIME,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "volunteering_goals_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "volunteering_goals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_volunteering_opportunities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "organizationId" TEXT,
    "category" TEXT NOT NULL,
    "location" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_volunteering_opportunities" ("ageRequirement", "approvedById", "category", "commitmentLevel", "contactEmail", "contactPhone", "createdAt", "description", "endDate", "hoursPerSession", "id", "isOngoing", "location", "maxVolunteers", "organization", "organizationId", "postedById", "skillsRequired", "startDate", "status", "title", "totalHours", "updatedAt", "website") SELECT "ageRequirement", "approvedById", "category", "commitmentLevel", "contactEmail", "contactPhone", "createdAt", "description", "endDate", "hoursPerSession", "id", "isOngoing", "location", "maxVolunteers", "organization", "organizationId", "postedById", "skillsRequired", "startDate", "status", "title", "totalHours", "updatedAt", "website" FROM "volunteering_opportunities";
DROP TABLE "volunteering_opportunities";
ALTER TABLE "new_volunteering_opportunities" RENAME TO "volunteering_opportunities";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
