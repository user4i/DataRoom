-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('GEMINI', 'OPENAI_COMPATIBLE');

-- CreateTable
CREATE TABLE "UserAiSettings" (
    "userId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "provider" "AiProvider" NOT NULL DEFAULT 'OPENAI_COMPATIBLE',
    "baseUrl" TEXT,
    "model" TEXT,
    "apiKeyCipher" TEXT,
    "apiKeyLast4" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAiSettings_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserAiSettings" ADD CONSTRAINT "UserAiSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
