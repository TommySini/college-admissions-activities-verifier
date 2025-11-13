-- CreateTable
CREATE TABLE "extracted_awards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" TEXT,
    "year" TEXT,
    "description" TEXT,
    CONSTRAINT "extracted_awards_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "alumni_applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
