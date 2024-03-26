/*
  Warnings:

  - You are about to drop the `UpLoadNum` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `index` to the `UploadHash` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "idx_upload_num";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UpLoadNum";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "UploadNum" (
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
    "gas" INTEGER NOT NULL,
    "numHash" TEXT NOT NULL,
    CONSTRAINT "UploadNum_numHash_fkey" FOREIGN KEY ("numHash") REFERENCES "UploadHash" ("infoHash") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReuploadNum" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "types" INTEGER NOT NULL,
    "ni" TEXT NOT NULL,
    "ri" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "blockNum" INTEGER NOT NULL,
    "gas" INTEGER NOT NULL,
    "originalHash" TEXT NOT NULL,
    CONSTRAINT "ReuploadNum_originalHash_fkey" FOREIGN KEY ("originalHash") REFERENCES "UploadHash" ("infoHash") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UploadHash" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "types" INTEGER NOT NULL,
    "infoHash" TEXT NOT NULL,
    "index" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "blockNum" INTEGER NOT NULL,
    "gas" INTEGER NOT NULL
);
INSERT INTO "new_UploadHash" ("blockNum", "from", "gas", "id", "infoHash", "timestamp", "to", "types") SELECT "blockNum", "from", "gas", "id", "infoHash", "timestamp", "to", "types" FROM "UploadHash";
DROP TABLE "UploadHash";
ALTER TABLE "new_UploadHash" RENAME TO "UploadHash";
CREATE UNIQUE INDEX "UploadHash_infoHash_key" ON "UploadHash"("infoHash");
CREATE INDEX "idx_upload_hash" ON "UploadHash"("from", "to", "types");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "UploadNum_numHash_key" ON "UploadNum"("numHash");

-- CreateIndex
CREATE INDEX "idx_upload_num" ON "UploadNum"("from", "to", "types");

-- CreateIndex
CREATE UNIQUE INDEX "ReuploadNum_originalHash_key" ON "ReuploadNum"("originalHash");

-- CreateIndex
CREATE INDEX "idx_reupload_num" ON "ReuploadNum"("from", "to", "types");
