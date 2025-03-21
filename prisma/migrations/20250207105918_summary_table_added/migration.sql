/*
  Warnings:

  - You are about to drop the column `description` on the `Scheme` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `MainQuestion` table without a default value. This is not possible if the table is not empty.
  - Made the column `schemeId` on table `MainQuestion` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Scheme` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Variations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MainQuestion" DROP CONSTRAINT "MainQuestion_schemeId_fkey";

-- AlterTable
ALTER TABLE "MainQuestion" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "schemeId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Scheme" DROP COLUMN "description",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Variations" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Summary" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "schemeName" TEXT,
    "status" TEXT NOT NULL,
    "mainQuestionsCount" INTEGER NOT NULL DEFAULT 0,
    "variationsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "Summary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Summary_status_idx" ON "Summary"("status");

-- CreateIndex
CREATE INDEX "Summary_fileName_idx" ON "Summary"("fileName");

-- CreateIndex
CREATE INDEX "Summary_createdAt_idx" ON "Summary"("createdAt");

-- CreateIndex
CREATE INDEX "MainQuestion_schemeId_idx" ON "MainQuestion"("schemeId");

-- CreateIndex
CREATE INDEX "Variations_mainQuestionId_idx" ON "Variations"("mainQuestionId");

-- AddForeignKey
ALTER TABLE "MainQuestion" ADD CONSTRAINT "MainQuestion_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
