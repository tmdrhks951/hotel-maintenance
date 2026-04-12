import { PrismaClient, Role, Position, LocationType } from '@prisma/client';
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

  // ================================================================
  // 1. ADMIN 계정 생성
  // ================================================================
  const passwordHash = await hashPassword('Admin@1234!');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@hotel.com',
      loginId: 'admin',
      passwordHash,
      name: '시스템 관리자',
      role: Role.ADMIN,
      position: Position.OTHER,
      branchId: null,
      isActive: true,
    },
  });
  console.log(`✅ Admin 계정 생성: ${admin.email} (loginId: admin)`);

  // ================================================================
  // 2. 지점(Branch) 생성
  // ================================================================
  const branchData = [
    // 부모 지점
    { name: '명동점', code: 'MYEONGDONG', sortOrder: 10 },
    { name: '덕수궁점', code: 'DEOKSUGUNG', sortOrder: 20 },
    { name: '사당점', code: 'SADANG', sortOrder: 30 },
    // 개별 지점 (상위 PIN 지점)
    { name: 'SOA', code: 'SOA', sortOrder: 1 },
    { name: '카와우소 1호점 (사당)', code: 'KAWAUSO1', sortOrder: 2 },
    { name: '카와우소 2호점 (명동)', code: 'KAWAUSO2', sortOrder: 3 },
    { name: '카와우소 3호점 (덕수궁)', code: 'KAWAUSO3', sortOrder: 4 },
    { name: '국도빌딩', code: 'GUKDO', sortOrder: 5 },
  ];

  const branchMap: Record<string, string> = {};

  for (const b of branchData) {
    const branch = await prisma.branch.create({
      data: {
        name: b.name,
        code: b.code,
        sortOrder: b.sortOrder,
        isActive: true,
      },
    });
    branchMap[b.code] = branch.id;
  }

  // 자식 지점: 명동 1~3호점
  const myeongdongChildren = [
    { name: '명동 1호점', code: 'MYEONGDONG1', sortOrder: 11 },
    { name: '명동 2호점', code: 'MYEONGDONG2', sortOrder: 12 },
    { name: '명동 3호점', code: 'MYEONGDONG3', sortOrder: 13 },
  ];
  for (const c of myeongdongChildren) {
    const branch = await prisma.branch.create({
      data: { name: c.name, code: c.code, sortOrder: c.sortOrder, isActive: true, parentId: branchMap['MYEONGDONG'] },
    });
    branchMap[c.code] = branch.id;
  }

  // 덕수궁 자식
  const deoksugungChildren = [
    { name: '덕수궁 1호점', code: 'DEOKSUGUNG1', sortOrder: 21 },
    { name: '덕수궁 2호점', code: 'DEOKSUGUNG2', sortOrder: 22 },
  ];
  for (const c of deoksugungChildren) {
    const branch = await prisma.branch.create({
      data: { name: c.name, code: c.code, sortOrder: c.sortOrder, isActive: true, parentId: branchMap['DEOKSUGUNG'] },
    });
    branchMap[c.code] = branch.id;
  }

  // 사당 자식
  const sadangChildren = [
    { name: '사당 1호점', code: 'SADANG1', sortOrder: 31 },
  ];
  for (const c of sadangChildren) {
    const branch = await prisma.branch.create({
      data: { name: c.name, code: c.code, sortOrder: c.sortOrder, isActive: true, parentId: branchMap['SADANG'] },
    });
    branchMap[c.code] = branch.id;
  }

  console.log(`✅ 지점 ${Object.keys(branchMap).length}개 생성 완료`);

  // ================================================================
  // 3. 위치(Location) 생성 — 주요 지점에 기본 위치 추가
  // ================================================================
  const locationTemplates = [
    { name: '101호', type: LocationType.ROOM },
    { name: '102호', type: LocationType.ROOM },
    { name: '103호', type: LocationType.ROOM },
    { name: '201호', type: LocationType.ROOM },
    { name: '202호', type: LocationType.ROOM },
    { name: '203호', type: LocationType.ROOM },
    { name: '301호', type: LocationType.ROOM },
    { name: '302호', type: LocationType.ROOM },
    { name: '로비', type: LocationType.PUBLIC_AREA },
    { name: '복도', type: LocationType.PUBLIC_AREA },
    { name: '엘리베이터', type: LocationType.PUBLIC_AREA },
    { name: '화장실(공용)', type: LocationType.PUBLIC_AREA },
    { name: '사무실', type: LocationType.OFFICE },
    { name: '직원휴게실', type: LocationType.BACK_OF_HOUSE },
    { name: '세탁실', type: LocationType.BACK_OF_HOUSE },
    { name: '기계실', type: LocationType.BACK_OF_HOUSE },
  ];

  // 개별 운영 지점들에만 위치 생성 (부모 지점 제외)
  const activeBranchCodes = ['SOA', 'KAWAUSO1', 'KAWAUSO2', 'KAWAUSO3', 'GUKDO',
    'MYEONGDONG1', 'MYEONGDONG2', 'MYEONGDONG3', 'DEOKSUGUNG1', 'DEOKSUGUNG2', 'SADANG1'];

  let locCount = 0;
  for (const code of activeBranchCodes) {
    const bid = branchMap[code];
    if (!bid) continue;
    for (const loc of locationTemplates) {
      await prisma.location.create({
        data: {
          name: loc.name,
          type: loc.type,
          branchId: bid,
          isActive: true,
        },
      });
      locCount++;
    }
  }

  console.log(`✅ 위치 ${locCount}개 생성 완료`);
  console.log('');
  console.log('🎉 초기 데이터 설정 완료!');
  console.log('📌 관리자 로그인: admin / Admin@1234!');
  console.log('⚠️  초기 비밀번호를 즉시 변경하세요.');
}

main()
  .catch((err) => {
    console.error('❌ Seed 실패:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
