-- CreateTable
CREATE TABLE "BiharKrishiMetrics" (
    "id" SERIAL NOT NULL,
    "apiKey" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "schemeName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiharKrishiMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BiharKrishiMetrics_apiKey_idx" ON "BiharKrishiMetrics"("apiKey");

-- CreateIndex
CREATE INDEX "BiharKrishiMetrics_schemeName_idx" ON "BiharKrishiMetrics"("schemeName");

-- CreateIndex
CREATE INDEX "BiharKrishiMetrics_status_idx" ON "BiharKrishiMetrics"("status");

-- CreateIndex
CREATE INDEX "BiharKrishiMetrics_createdAt_idx" ON "BiharKrishiMetrics"("createdAt");
