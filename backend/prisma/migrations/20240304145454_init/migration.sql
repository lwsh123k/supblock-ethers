-- CreateTable
CREATE TABLE "UploadHash" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "types" INTEGER NOT NULL,
    "infoHash" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "blockNum" INTEGER NOT NULL,
    "gas" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "UpLoadNum" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "types" INTEGER NOT NULL,
    "state" INTEGER NOT NULL,
    "ni" TEXT NOT NULL,
    "ri" TEXT NOT NULL,
    "t" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "blockNum" INTEGER NOT NULL,
    "gas" INTEGER NOT NULL
);

-- CreateIndex
CREATE INDEX "idx_upload_hash" ON "UploadHash"("from", "to", "types");

-- CreateIndex
CREATE INDEX "idx_upload_num" ON "UpLoadNum"("from", "to", "types");
