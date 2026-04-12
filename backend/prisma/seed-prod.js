// Production seed — plain JS, no ts-node needed
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // ================================================================
  // 1. Admin 계정
  // ================================================================
  const existing = await prisma.user.findFirst({ where: { email: 'admin@hotel.com' } });
  if (!existing) {
    const hash = await bcrypt.hash('Admin@1234!', 12);
    await prisma.user.create({
      data: {
        email: 'admin@hotel.com', loginId: 'admin', passwordHash: hash,
        name: '시스템 관리자', role: 'ADMIN', position: 'OTHER', isActive: true,
      },
    });
    console.log('✅ Admin created');
  } else {
    console.log('✅ Admin already exists');
  }

  // ================================================================
  // 1-2. 테스트 계정 생성 (6종)
  // ================================================================
  const testAccounts = [
    { loginId: 'ops.leader', email: 'ops.leader@hotel.com', name: '운영팀장', role: 'OPERATIONS', position: 'TEAM_LEADER', department: 'OPERATIONS_1' },
    { loginId: 'qc.leader', email: 'qc.leader@hotel.com', name: 'QC팀장', role: 'QC', position: 'TEAM_LEADER', department: 'QC_1' },
    { loginId: 'ops.member', email: 'ops.member@hotel.com', name: '운영팀원', role: 'OPERATIONS', position: 'MEMBER', department: 'OPERATIONS_1' },
    { loginId: 'qc.member', email: 'qc.member@hotel.com', name: 'QC팀원', role: 'QC', position: 'MEMBER', department: 'QC_1' },
    { loginId: 'vendor', email: 'vendor@hotel.com', name: '외부업체', role: 'VENDOR', position: 'OTHER', department: 'NONE' },
  ];

  const testPwHash = await bcrypt.hash('Test@1234!', 12);
  for (const acc of testAccounts) {
    const exists = await prisma.user.findFirst({ where: { loginId: acc.loginId } });
    if (!exists) {
      await prisma.user.create({
        data: {
          loginId: acc.loginId, email: acc.email, passwordHash: testPwHash,
          name: acc.name, role: acc.role, position: acc.position, department: acc.department,
          status: 'APPROVED', isActive: true,
        },
      });
      console.log(`✅ ${acc.name} (${acc.loginId}) created`);
    }
  }

  // ================================================================
  // 2. 지점 데이터 확인 — 이미 최신이면 스킵
  // ================================================================
  const marker = await prisma.branch.findFirst({ where: { code: 'GANGNAM' } });
  if (marker) {
    console.log('✅ Branches already up to date (v2). Skipping.');
    return;
  }

  // ================================================================
  // 3. 기존 지점/위치 정리
  // ================================================================
  console.log('🔄 Cleaning old branch/location data...');
  await prisma.user.updateMany({ where: { branchId: { not: null } }, data: { branchId: null, branchIds: [] } });
  await prisma.location.deleteMany({});
  await prisma.branch.updateMany({ data: { parentId: null } });
  await prisma.branch.deleteMany({});
  console.log('✅ Old data cleaned');

  // ================================================================
  // 4. 신규 지점 생성 (20개) — 일반 표시 순서 기준 sortOrder
  // ================================================================
  const branchDefs = [
    { name: '명동 1호점', code: 'MYEONGDONG1', sortOrder: 1 },
    { name: '명동 2호점', code: 'MYEONGDONG2', sortOrder: 2 },
    { name: '명동 3호점', code: 'MYEONGDONG3', sortOrder: 3 },
    { name: '종로 1호점', code: 'JONGNO', sortOrder: 4 },
    { name: '종로 2호점', code: 'JONGNO2', sortOrder: 5 },
    { name: '더서울', code: 'THESEOUL', sortOrder: 6 },
    { name: '덕수궁', code: 'DEOKSUGUNG', sortOrder: 7 },
    { name: '스퀘어', code: 'SQUARE', sortOrder: 8 },
    { name: '센트럴', code: 'CENTRAL', sortOrder: 9 },
    { name: '사당점', code: 'SADANG', sortOrder: 10 },
    { name: '강남', code: 'GANGNAM', sortOrder: 11 },
    { name: '코엑스 (본관)', code: 'COEX_B', sortOrder: 12 },
    { name: '코엑스 (별관)', code: 'COEX_A', sortOrder: 13 },
    { name: '신사 단델리온', code: 'DANDELION', sortOrder: 14 },
    { name: '선릉점', code: 'SEOLLEUNG', sortOrder: 15 },
    { name: '카와우소 1', code: 'KAWAUSO1', sortOrder: 16 },
    { name: '카와우소 2', code: 'KAWAUSO2', sortOrder: 17 },
    { name: '카와우소 3', code: 'KAWAUSO3', sortOrder: 18 },
    { name: 'SOA', code: 'SOA', sortOrder: 19 },
    { name: '국도빌딩', code: 'GUKDO', sortOrder: 20 },
  ];

  const map = {};
  for (const b of branchDefs) {
    const r = await prisma.branch.create({ data: { name: b.name, code: b.code, sortOrder: b.sortOrder, isActive: true } });
    map[b.code] = r.id;
  }
  console.log(`✅ ${branchDefs.length} branches created`);

  // ================================================================
  // 5. 객실(Location) 생성 — 실제 운영 데이터
  // ================================================================
  const branchRooms = {
    SADANG:      ['301','302','401','402','403','501','502','503','601','602','603','701','702','703'],
    KAWAUSO1:    [],
    THESEOUL:    ['201','202','301','302','401','402','501','502','601','602','701','702','801','802','901','1001','1002'],
    JONGNO:      { rooms: ['301','302','303','304','401','402','403','404','405','501','502','503','504','505'], office: ['305'] },
    JONGNO2:     ['401','402','403','501','502'],
    MYEONGDONG1: ['301','302','303','401','402','403','501','502','503','601','602','603','701','702','703','801','802','803'],
    SOA:         [],
    GUKDO:       [],
    MYEONGDONG2: ['201','202','301','401','402','501','502','601','602','701','702','801','802','901','902'],
    MYEONGDONG3: ['201','202','301','302','401','402'],
    KAWAUSO2:    [],
    SQUARE:      ['201','202','301','302','401','501'],
    DEOKSUGUNG:  ['201','202','301','302','401','501','502','601'],
    KAWAUSO3:    [],
    CENTRAL:     ['301','401','402','501','502','601','602','701','702','801','802','901','902','1001','1002'],
    DANDELION:   ['B101','B102','101','102','103','104','201','202','203','204','301','302'],
    GANGNAM:     ['401','501','601','701','801','901','1001','1101','1102'],
    COEX_B:      ['201','202','301','302','401','402','501','502','601','602','701','702','801','802','901','902','1001','1002','1101','1102','1201','1202'],
    COEX_A:      ['301','302','401','402','501','502','601','602','701','702','801','802','901','902','1001','1002','1101','1102','1201'],
    SEOLLEUNG:   ['701','801','802','901','902','1001','1002','1101','1102','1201','1202','1301','1302'],
  };

  let roomCount = 0;
  for (const [code, roomData] of Object.entries(branchRooms)) {
    const bid = map[code];
    if (!bid) continue;

    if (Array.isArray(roomData)) {
      for (const r of roomData) {
        await prisma.location.create({
          data: { name: `${r}호`, type: 'ROOM', branchId: bid, isActive: true },
        });
        roomCount++;
      }
    } else {
      for (const r of roomData.rooms) {
        await prisma.location.create({
          data: { name: `${r}호`, type: 'ROOM', branchId: bid, isActive: true },
        });
        roomCount++;
      }
      for (const r of roomData.office) {
        await prisma.location.create({
          data: { name: `${r}호`, type: 'OFFICE', branchId: bid, isActive: true },
        });
        roomCount++;
      }
    }
  }

  console.log(`✅ ${roomCount} rooms created`);

  // ================================================================
  // 6. 팀원 계정에 담당 지점 연결 (명동 1호점)
  // ================================================================
  const myeongdong1Id = map['MYEONGDONG1'];
  if (myeongdong1Id) {
    const memberAccounts = ['ops.member', 'qc.member'];
    for (const lid of memberAccounts) {
      const u = await prisma.user.findFirst({ where: { loginId: lid } });
      if (u && !u.branchId) {
        await prisma.user.update({
          where: { id: u.id },
          data: { branchId: myeongdong1Id, branchIds: [myeongdong1Id] },
        });
        console.log(`✅ ${lid} → 명동 1호점 연결`);
      }
    }
  }

  console.log('🎉 Production seed complete!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
