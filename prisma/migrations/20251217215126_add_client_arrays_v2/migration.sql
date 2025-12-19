-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "whatsapp_phone" TEXT,
    "sector" TEXT,
    "certifications" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClientKeyword" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "word" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "ClientKeyword_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientDepartment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "ClientDepartment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SearchConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketType" TEXT,
    "minBudget" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "SearchConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SniperRules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mustHaveCertifications" TEXT,
    "forbiddenKeywords" TEXT,
    "minProfitability" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "SniperRules_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tender" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_boamp" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "pdf_url" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ai_analysis" TEXT NOT NULL,
    "match_score" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dume_data" TEXT,
    "decision_token" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    CONSTRAINT "Opportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Opportunity_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SearchConfig_clientId_key" ON "SearchConfig"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "SniperRules_clientId_key" ON "SniperRules"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Tender_id_boamp_key" ON "Tender"("id_boamp");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_decision_token_key" ON "Opportunity"("decision_token");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_clientId_tenderId_key" ON "Opportunity"("clientId", "tenderId");
