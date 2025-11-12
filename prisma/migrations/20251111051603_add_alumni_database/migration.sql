-- CreateTable
CREATE TABLE "alumni_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "privacy" TEXT NOT NULL DEFAULT 'ANONYMOUS',
    "displayName" TEXT,
    "contactEmail" TEXT,
    "intendedMajor" TEXT,
    "careerInterestTags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "alumni_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "alumni_applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alumniId" TEXT NOT NULL,
    "sourceFileUrl" TEXT NOT NULL,
    "sourceFileMime" TEXT NOT NULL,
    "parseStatus" TEXT NOT NULL DEFAULT 'pending',
    "parseError" TEXT,
    "rawText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "alumni_applications_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "alumni_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "extracted_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "role" TEXT,
    "organization" TEXT,
    "hours" REAL,
    "years" TEXT,
    CONSTRAINT "extracted_activities_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "alumni_applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "extracted_essays" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "prompt" TEXT,
    "summary" TEXT,
    "tags" TEXT,
    CONSTRAINT "extracted_essays_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "alumni_applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "admission_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "collegeName" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decisionRound" TEXT,
    "rankBucket" TEXT,
    CONSTRAINT "admission_results_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "alumni_applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "alumni_profiles_userId_key" ON "alumni_profiles"("userId");

-- CreateIndex
CREATE INDEX "alumni_profiles_privacy_idx" ON "alumni_profiles"("privacy");

-- CreateIndex
CREATE INDEX "admission_results_rankBucket_idx" ON "admission_results"("rankBucket");
