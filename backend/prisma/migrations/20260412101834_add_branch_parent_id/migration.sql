-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
