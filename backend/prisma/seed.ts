import { PrismaClient, Role, Position } from '@prisma/client';
import { hashPassword } from '../src/common/utils/password.util';

const prisma = new PrismaClient();

async function main() {
  // 중복 실행 방지
  const existing = await prisma.user.findFirst({
    where: { email: 'admin@hotel.com' },
  });

  if (existing) {
    console.log('✅ Admin 계정이 이미 존재합니다. seed를 건너뜁니다.');
    return;
  }

  // 초기 ADMIN 계정 생성
  // 임시 비밀번호: Admin@1234! — 운영 시작 전 반드시 변경할 것
  const passwordHash = await hashPassword('Admin@1234!');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@hotel.com',
      passwordHash,
      name: '시스템 관리자',
      role: Role.ADMIN,
      position: Position.OTHER,
      branchId: null,
      isActive: true,
    },
  });

  console.log(`✅ Admin 계정 생성 완료: ${admin.email}`);
  console.log('⚠️  초기 비밀번호(Admin@1234!)를 즉시 변경하세요.');
}

main()
  .catch((err) => {
    console.error('❌ Seed 실패:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
