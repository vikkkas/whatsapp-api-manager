-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "components" JSONB,
ADD COLUMN     "displayName" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "webhookVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Template_metaTemplateId_idx" ON "Template"("metaTemplateId");
