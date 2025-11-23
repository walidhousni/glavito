-- AlterTable
ALTER TABLE "public"."internal_channels" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "public"."tickets" ADD COLUMN     "relatedDealId" TEXT,
ADD COLUMN     "relatedLeadId" TEXT;

-- CreateTable
CREATE TABLE "public"."ticket_subtasks" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ticket_note_reactions" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_note_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."room_message_reactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_subtasks_ticketId_order_idx" ON "public"."ticket_subtasks"("ticketId", "order");

-- CreateIndex
CREATE INDEX "ticket_note_reactions_noteId_idx" ON "public"."ticket_note_reactions"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_note_reactions_noteId_userId_emoji_key" ON "public"."ticket_note_reactions"("noteId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "room_message_reactions_messageId_idx" ON "public"."room_message_reactions"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "room_message_reactions_messageId_userId_emoji_key" ON "public"."room_message_reactions"("messageId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "tickets_tenantId_relatedLeadId_idx" ON "public"."tickets"("tenantId", "relatedLeadId");

-- CreateIndex
CREATE INDEX "tickets_tenantId_relatedDealId_idx" ON "public"."tickets"("tenantId", "relatedDealId");

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_relatedLeadId_fkey" FOREIGN KEY ("relatedLeadId") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_relatedDealId_fkey" FOREIGN KEY ("relatedDealId") REFERENCES "public"."deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_subtasks" ADD CONSTRAINT "ticket_subtasks_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_subtasks" ADD CONSTRAINT "ticket_subtasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_note_reactions" ADD CONSTRAINT "ticket_note_reactions_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "public"."ticket_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_note_reactions" ADD CONSTRAINT "ticket_note_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."room_message_reactions" ADD CONSTRAINT "room_message_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."internal_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."room_message_reactions" ADD CONSTRAINT "room_message_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
