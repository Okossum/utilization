-- CreateTable
CREATE TABLE "EmployeeDossier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "comments" TEXT,
    "travelReadiness" TEXT,
    "projectHistory" JSONB,
    "projectOffers" JSONB,
    "jiraTickets" JSONB,
    "excelData" JSONB
);

-- CreateTable
CREATE TABLE "UtilizationData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "person" TEXT NOT NULL,
    "lob" TEXT,
    "bereich" TEXT,
    "cc" TEXT,
    "team" TEXT,
    "lbs" TEXT,
    "week" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "auslastungValue" REAL,
    "einsatzplanValue" REAL,
    "finalValue" REAL,
    "isHistorical" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "auslastungId" TEXT,
    "einsatzplanId" TEXT,
    "lastUpdated" DATETIME NOT NULL,
    "dataVersion" INTEGER NOT NULL DEFAULT 1,
    "isLatest" BOOLEAN NOT NULL DEFAULT true
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Auslastung" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadVersion" INTEGER NOT NULL DEFAULT 1,
    "person" TEXT NOT NULL,
    "lob" TEXT,
    "bereich" TEXT,
    "cc" TEXT,
    "team" TEXT,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "replacedBy" TEXT
);
INSERT INTO "new_Auslastung" ("bereich", "cc", "createdAt", "fileName", "id", "lob", "person", "team", "updatedAt", "uploadDate") SELECT "bereich", "cc", "createdAt", "fileName", "id", "lob", "person", "team", "updatedAt", "uploadDate" FROM "Auslastung";
DROP TABLE "Auslastung";
ALTER TABLE "new_Auslastung" RENAME TO "Auslastung";
CREATE TABLE "new_Einsatzplan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadVersion" INTEGER NOT NULL DEFAULT 1,
    "person" TEXT NOT NULL,
    "lbs" TEXT,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "replacedBy" TEXT
);
INSERT INTO "new_Einsatzplan" ("createdAt", "fileName", "id", "lbs", "person", "updatedAt", "uploadDate") SELECT "createdAt", "fileName", "id", "lbs", "person", "updatedAt", "uploadDate" FROM "Einsatzplan";
DROP TABLE "Einsatzplan";
ALTER TABLE "new_Einsatzplan" RENAME TO "Einsatzplan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDossier_employeeId_key" ON "EmployeeDossier"("employeeId");

-- CreateIndex
CREATE INDEX "UtilizationData_person_idx" ON "UtilizationData"("person");

-- CreateIndex
CREATE INDEX "UtilizationData_week_idx" ON "UtilizationData"("week");

-- CreateIndex
CREATE INDEX "UtilizationData_year_weekNumber_idx" ON "UtilizationData"("year", "weekNumber");

-- CreateIndex
CREATE INDEX "UtilizationData_isHistorical_idx" ON "UtilizationData"("isHistorical");

-- CreateIndex
CREATE INDEX "UtilizationData_isLatest_idx" ON "UtilizationData"("isLatest");

-- CreateIndex
CREATE UNIQUE INDEX "UtilizationData_person_week_key" ON "UtilizationData"("person", "week");
