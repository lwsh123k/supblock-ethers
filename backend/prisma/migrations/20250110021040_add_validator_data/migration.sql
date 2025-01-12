-- CreateTable
CREATE TABLE "Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "gasFee" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "SupBlock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publicKey" TEXT NOT NULL,
    "address" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "UploadHash" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transaction_hash" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "types" INTEGER NOT NULL,
    "infoHash" TEXT NOT NULL,
    "tA" TEXT NOT NULL,
    "tB" TEXT NOT NULL,
    "index" TEXT NOT NULL,
    "blockNum" INTEGER NOT NULL,
    "gas" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "UploadNum" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transaction_hash" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "types" INTEGER NOT NULL,
    "ni" TEXT NOT NULL,
    "ri" TEXT NOT NULL,
    "t" TEXT NOT NULL,
    "blockNum" INTEGER NOT NULL,
    "gas" INTEGER NOT NULL,
    "correctness" BOOLEAN NOT NULL,
    "numHashA" TEXT NOT NULL,
    "numHashB" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ReuploadNum" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transaction_hash" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "types" INTEGER NOT NULL,
    "ni" TEXT NOT NULL,
    "ri" TEXT NOT NULL,
    "blockNum" INTEGER NOT NULL,
    "gas" INTEGER NOT NULL,
    "originalHashA" TEXT NOT NULL,
    "originalHashB" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "App2RelayEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transaction_hash" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "relay_address" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "data_hash" TEXT NOT NULL,
    "info_hash" TEXT NOT NULL,
    "blockNum" INTEGER NOT NULL,
    "gas" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Pre2NextEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transaction_hash" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "relay_address" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "data_hash" TEXT NOT NULL,
    "blockNum" INTEGER NOT NULL,
    "gas" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "RelayResEvidenceEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transaction_hash" TEXT NOT NULL,
    "relay_anonymous_account" TEXT NOT NULL,
    "app_temp_account" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "data_hash" TEXT NOT NULL,
    "app2_relay_response_evidence" TEXT NOT NULL,
    "pre2_next_response_evidence" TEXT NOT NULL,
    "info_hash" TEXT NOT NULL,
    "blockNum" INTEGER NOT NULL,
    "gas" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "App2ValidatorData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "from" TEXT,
    "to" TEXT,
    "appTempAccount" TEXT,
    "appTempAccountPubkey" TEXT,
    "r" TEXT,
    "hf" TEXT,
    "hb" TEXT,
    "b" INTEGER,
    "c" TEXT,
    "l" INTEGER NOT NULL,
    "chainIndex" INTEGER NOT NULL,
    "hashBackwardRelation" INTEGER
);

-- CreateTable
CREATE TABLE "RelayFinalData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "from" TEXT,
    "to" TEXT,
    "preAppTempAccount" TEXT,
    "preRelayAccount" TEXT,
    "hf" TEXT,
    "hb" TEXT,
    "b" INTEGER,
    "n" INTEGER,
    "t" TEXT,
    "l" INTEGER NOT NULL,
    "app2ValidatorDataId" INTEGER NOT NULL,
    CONSTRAINT "RelayFinalData_app2ValidatorDataId_fkey" FOREIGN KEY ("app2ValidatorDataId") REFERENCES "App2ValidatorData" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadHash_transaction_hash_key" ON "UploadHash"("transaction_hash");

-- CreateIndex
CREATE UNIQUE INDEX "UploadNum_transaction_hash_key" ON "UploadNum"("transaction_hash");

-- CreateIndex
CREATE INDEX "idx_upload_num" ON "UploadNum"("from", "to", "types");

-- CreateIndex
CREATE UNIQUE INDEX "ReuploadNum_transaction_hash_key" ON "ReuploadNum"("transaction_hash");

-- CreateIndex
CREATE INDEX "idx_reupload_num" ON "ReuploadNum"("from", "to", "types");

-- CreateIndex
CREATE UNIQUE INDEX "App2RelayEvent_transaction_hash_key" ON "App2RelayEvent"("transaction_hash");

-- CreateIndex
CREATE UNIQUE INDEX "Pre2NextEvent_transaction_hash_key" ON "Pre2NextEvent"("transaction_hash");

-- CreateIndex
CREATE UNIQUE INDEX "RelayResEvidenceEvent_transaction_hash_key" ON "RelayResEvidenceEvent"("transaction_hash");

-- CreateIndex
CREATE UNIQUE INDEX "RelayFinalData_app2ValidatorDataId_key" ON "RelayFinalData"("app2ValidatorDataId");
