-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ONLINE', 'AWAY', 'BUSY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "maxConcurrentChats" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "status" "AgentStatus" NOT NULL DEFAULT 'OFFLINE';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "snoozedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CannedResponse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "category" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CannedResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CannedResponse_tenantId_idx" ON "CannedResponse"("tenantId");

-- CreateIndex
CREATE INDEX "CannedResponse_shortcut_idx" ON "CannedResponse"("shortcut");

-- AddForeignKey
ALTER TABLE "CannedResponse" ADD CONSTRAINT "CannedResponse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
