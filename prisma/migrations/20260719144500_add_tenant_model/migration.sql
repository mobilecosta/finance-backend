-- Apply init migration tables (users, accounts, categories, transactions)
CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL NOT NULL,
    "openId" VARCHAR(64) NOT NULL,
    "name" TEXT,
    "email" VARCHAR(320),
    "loginMethod" VARCHAR(64),
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSignedIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "accounts" (
    "id" SERIAL NOT NULL,
    "userId" VARCHAR(64) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(30) NOT NULL DEFAULT 'checking',
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "color" VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
    "icon" VARCHAR(50) NOT NULL DEFAULT 'wallet.pass',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "categories" (
    "id" SERIAL NOT NULL,
    "userId" VARCHAR(64) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'expense',
    "color" VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
    "icon" VARCHAR(50) NOT NULL DEFAULT 'tag.fill',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "transactions" (
    "id" SERIAL NOT NULL,
    "userId" VARCHAR(64) NOT NULL,
    "accountId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "date" VARCHAR(10) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "paymentMethod" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_openId_key" ON "users"("openId");

-- Apply add_tests_table migration
CREATE TABLE IF NOT EXISTS "tests" (
    "id" SERIAL NOT NULL,
    "reportHtml" TEXT NOT NULL,
    "reportPdf" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tests_pkey" PRIMARY KEY ("id")
);

-- Create tenants table
CREATE TABLE IF NOT EXISTS "tenants" (
    "tenantId" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("tenantId")
);

-- Insert default tenant
INSERT INTO "tenants" ("name", "updatedAt") VALUES ('Default', CURRENT_TIMESTAMP);

-- Add tenantId column to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenantId" INTEGER NOT NULL DEFAULT 1;

-- Add tenantId column to accounts
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "tenantId" INTEGER NOT NULL DEFAULT 1;

-- Add tenantId column to categories
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "tenantId" INTEGER NOT NULL DEFAULT 1;

-- Add tenantId column to transactions
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "tenantId" INTEGER NOT NULL DEFAULT 1;

-- Add foreign keys
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("openId") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "categories" ADD CONSTRAINT "categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("openId") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("openId") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
