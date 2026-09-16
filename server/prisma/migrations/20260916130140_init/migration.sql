-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeechGeneration" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "voice" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'MP3',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "SpeechGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SpeechGeneration_userId_createdAt_idx" ON "SpeechGeneration"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "SpeechGeneration" ADD CONSTRAINT "SpeechGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
