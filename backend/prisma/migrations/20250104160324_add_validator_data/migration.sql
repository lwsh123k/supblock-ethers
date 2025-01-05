-- CreateTable
CREATE TABLE "ChainInitData" (
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
    "chainIndex" INTEGER NOT NULL
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
    "l" INTEGER NOT NULL
);
