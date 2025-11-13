-- CreateTable
CREATE TABLE "embeddings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "ownerId" TEXT,
    "content" TEXT NOT NULL,
    "vector" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "embeddings_modelName_idx" ON "embeddings"("modelName");

-- CreateIndex
CREATE UNIQUE INDEX "embeddings_modelName_recordId_key" ON "embeddings"("modelName", "recordId");
