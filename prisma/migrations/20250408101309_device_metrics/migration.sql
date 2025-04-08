-- CreateTable
CREATE TABLE "DeviceMetrics" (
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "id" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "browserName" TEXT NOT NULL,
    "osName" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceMetrics_pkey" PRIMARY KEY ("id")
);
