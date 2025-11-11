-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_volunteering_participations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT,
    "studentId" TEXT NOT NULL,
    "activityId" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "totalHours" REAL NOT NULL,
    "hoursPerWeek" REAL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isManualLog" BOOLEAN NOT NULL DEFAULT false,
    "organizationName" TEXT,
    "activityName" TEXT,
    "activityDescription" TEXT,
    "serviceSheetUrl" TEXT,
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
INSERT INTO "new_volunteering_participations" ("activityId", "createdAt", "endDate", "hoursPerWeek", "id", "opportunityId", "startDate", "status", "studentId", "totalHours", "updatedAt", "verificationNotes", "verified", "verifiedAt", "verifiedBy") SELECT "activityId", "createdAt", "endDate", "hoursPerWeek", "id", "opportunityId", "startDate", "status", "studentId", "totalHours", "updatedAt", "verificationNotes", "verified", "verifiedAt", "verifiedBy" FROM "volunteering_participations";
DROP TABLE "volunteering_participations";
ALTER TABLE "new_volunteering_participations" RENAME TO "volunteering_participations";
CREATE UNIQUE INDEX "volunteering_participations_activityId_key" ON "volunteering_participations"("activityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
