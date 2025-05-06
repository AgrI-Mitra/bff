/*
  Warnings:

  - Added the required column `district` to the `DeviceMetrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language` to the `DeviceMetrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `DeviceMetrics` table without a default value. This is not possible if the table is not empty.
  - Made the column `sessionId` on table `DeviceMetrics` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `userId` to the `DeviceMetrics` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DeviceMetrics" ADD COLUMN     "district" TEXT NOT NULL,
ADD COLUMN     "language" TEXT NOT NULL,
ADD COLUMN     "state" TEXT NOT NULL,
ALTER COLUMN "sessionId" SET NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "DeviceMetrics" ADD CONSTRAINT "DeviceMetrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
