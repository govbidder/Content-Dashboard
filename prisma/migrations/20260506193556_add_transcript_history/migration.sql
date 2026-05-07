-- CreateTable
CREATE TABLE "TranscriptHistory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdBy" TEXT,
    "url" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "title" TEXT,
    "creator" TEXT,
    "duration" TEXT,
    "thumbnail" TEXT,
    "transcript" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TranscriptHistory_clientId_createdAt_idx" ON "TranscriptHistory"("clientId", "createdAt");
