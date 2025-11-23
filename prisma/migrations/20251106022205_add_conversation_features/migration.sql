-- AlterTable
ALTER TABLE "public"."ConversationNote" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "parentNoteId" TEXT,
ADD COLUMN     "reactions" JSONB;

-- AlterTable
ALTER TABLE "public"."MessageAdvanced" ADD COLUMN     "audioDuration" INTEGER,
ADD COLUMN     "audioUrl" TEXT,
ADD COLUMN     "isInternalNote" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reactions" JSONB,
ADD COLUMN     "transcription" TEXT;

-- CreateIndex
CREATE INDEX "ConversationNote_conversationId_isPinned_idx" ON "public"."ConversationNote"("conversationId", "isPinned");

-- CreateIndex
CREATE INDEX "ConversationNote_conversationId_createdAt_idx" ON "public"."ConversationNote"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageAdvanced_conversationId_isInternalNote_idx" ON "public"."MessageAdvanced"("conversationId", "isInternalNote");
