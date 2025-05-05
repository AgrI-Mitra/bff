-- CreateTable
CREATE TABLE "DeviceMetrics" (
    "id" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "deviceType" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "browserName" TEXT NOT NULL,
    "osName" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceMetrics_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DeviceMetrics" ADD CONSTRAINT "DeviceMetrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
