-- CreateTable
CREATE TABLE "Auslastung" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "person" TEXT NOT NULL,
    "lob" TEXT,
    "bereich" TEXT,
    "cc" TEXT,
    "team" TEXT
);

-- CreateTable
CREATE TABLE "WeekValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auslastungId" TEXT NOT NULL,
    "week" TEXT NOT NULL,
    "value" REAL NOT NULL,
    CONSTRAINT "WeekValue_auslastungId_fkey" FOREIGN KEY ("auslastungId") REFERENCES "Auslastung" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Einsatzplan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "person" TEXT NOT NULL,
    "lbs" TEXT
);

-- CreateTable
CREATE TABLE "EinsatzplanWeekValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "einsatzplanId" TEXT NOT NULL,
    "week" TEXT NOT NULL,
    "value" REAL NOT NULL,
    CONSTRAINT "EinsatzplanWeekValue_einsatzplanId_fkey" FOREIGN KEY ("einsatzplanId") REFERENCES "Einsatzplan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UploadHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "rowCount" INTEGER
);

-- CreateIndex
CREATE UNIQUE INDEX "WeekValue_auslastungId_week_key" ON "WeekValue"("auslastungId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "EinsatzplanWeekValue_einsatzplanId_week_key" ON "EinsatzplanWeekValue"("einsatzplanId", "week");
