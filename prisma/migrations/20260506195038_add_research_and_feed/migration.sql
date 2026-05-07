-- CreateTable
CREATE TABLE "ContentResearchHistory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdBy" TEXT,
    "platform" TEXT NOT NULL,
    "channelUrl" TEXT NOT NULL,
    "channelName" TEXT,
    "channelAvatar" TEXT,
    "timeframeDays" INTEGER NOT NULL DEFAULT 30,
    "videos" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentResearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoFeedAccount" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdBy" TEXT,
    "platform" TEXT NOT NULL,
    "channelUrl" TEXT NOT NULL,
    "channelName" TEXT,
    "channelAvatar" TEXT,
    "posts" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoFeedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentResearchHistory_clientId_createdAt_idx" ON "ContentResearchHistory"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoFeedAccount_clientId_idx" ON "VideoFeedAccount"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoFeedAccount_clientId_platform_key" ON "VideoFeedAccount"("clientId", "platform");
