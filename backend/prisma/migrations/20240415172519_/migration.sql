/*
  Warnings:

  - Added the required column `tA` to the `UploadHash` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tB` to the `UploadHash` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UploadHash" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "types" INTEGER NOT NULL,
    "infoHash" TEXT NOT NULL,
    "tA" TEXT NOT NULL,
    "tB" TEXT NOT NULL,
    "index" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "blockNum" INTEGER NOT NULL,
    "gas" INTEGER NOT NULL
);
INSERT INTO "new_UploadHash" ("blockNum", "from", "gas", "id", "index", "infoHash", "timestamp", "to", "types") SELECT "blockNum", "from", "gas", "id", "index", "infoHash", "timestamp", "to", "types" FROM "UploadHash";
DROP TABLE "UploadHash";
ALTER TABLE "new_UploadHash" RENAME TO "UploadHash";
CREATE UNIQUE INDEX "UploadHash_infoHash_key" ON "UploadHash"("infoHash");
CREATE INDEX "idx_upload_hash" ON "UploadHash"("from", "to", "types");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
