/*
  Warnings:

  - You are about to drop the column `state` on the `UploadNum` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UploadNum" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "types" INTEGER NOT NULL,
    "ni" TEXT NOT NULL,
    "ri" TEXT NOT NULL,
    "t" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "blockNum" INTEGER NOT NULL,
    "gas" INTEGER NOT NULL,
    "numHash" TEXT NOT NULL,
    CONSTRAINT "UploadNum_numHash_fkey" FOREIGN KEY ("numHash") REFERENCES "UploadHash" ("infoHash") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UploadNum" ("blockNum", "from", "gas", "id", "ni", "numHash", "ri", "t", "timestamp", "to", "types") SELECT "blockNum", "from", "gas", "id", "ni", "numHash", "ri", "t", "timestamp", "to", "types" FROM "UploadNum";
DROP TABLE "UploadNum";
ALTER TABLE "new_UploadNum" RENAME TO "UploadNum";
CREATE UNIQUE INDEX "UploadNum_numHash_key" ON "UploadNum"("numHash");
CREATE INDEX "idx_upload_num" ON "UploadNum"("from", "to", "types");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
