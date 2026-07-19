-- CreateTable
CREATE TABLE "tests" (
    "id" SERIAL NOT NULL,
    "reportHtml" TEXT NOT NULL,
    "reportPdf" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tests_pkey" PRIMARY KEY ("id")
);
