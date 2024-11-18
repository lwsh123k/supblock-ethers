-- CreateTable
CREATE TABLE "App2RelayEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "from_address" TEXT NOT NULL,
    "relay_address" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "data_hash" TEXT NOT NULL,
    "dataIndex" INTEGER NOT NULL,
    "lastRelay" BOOLEAN NOT NULL,
    "blockNum" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Pre2NextEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "from_address" TEXT NOT NULL,
    "relay_address" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "dataIndex" INTEGER NOT NULL,
    "blockNum" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RelayResEvidenceEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "relay_real_account" TEXT NOT NULL,
    "app_temp_account" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "data_hash" TEXT NOT NULL,
    "chainIndex" INTEGER NOT NULL,
    "blockNum" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "App2RelayEvent_data_hash_key" ON "App2RelayEvent"("data_hash");

-- CreateIndex
CREATE UNIQUE INDEX "Pre2NextEvent_from_address_relay_address_dataIndex_key" ON "Pre2NextEvent"("from_address", "relay_address", "dataIndex");

-- CreateIndex
CREATE UNIQUE INDEX "RelayResEvidenceEvent_data_hash_key" ON "RelayResEvidenceEvent"("data_hash");
