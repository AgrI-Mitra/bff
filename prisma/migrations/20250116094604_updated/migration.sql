-- CreateTable
CREATE TABLE "Scheme" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MainQuestion" (
    "id" SERIAL NOT NULL,
    "intent" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "schemeId" INTEGER,

    CONSTRAINT "MainQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variations" (
    "id" SERIAL NOT NULL,
    "variation" TEXT NOT NULL,
    "mainQuestionId" INTEGER NOT NULL,

    CONSTRAINT "Variations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Scheme_name_key" ON "Scheme"("name");

-- AddForeignKey
ALTER TABLE "MainQuestion" ADD CONSTRAINT "MainQuestion_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variations" ADD CONSTRAINT "Variations_mainQuestionId_fkey" FOREIGN KEY ("mainQuestionId") REFERENCES "MainQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
