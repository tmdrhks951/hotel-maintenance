// Production seed — plain JS, no ts-node needed
//
// 안전 원칙:
//  1. 어떤 데이터도 삭제하지 않는다 (파괴적 로직 금지)
//  2. 계정/비밀번호를 코드에 하드코딩하지 않는다 — 관리자 계정은 환경변수로만 생성
//  3. 모든 작업은 멱등(idempotent) — 이미 존재하면 건너뜀
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedAdmin() {
  // 이미 관리자 계정이 있으면 아무것도 하지 않음
  const adminExists = await prisma.user.findFirst({
    where: { role: 'ADMIN', deletedAt: null },
  });
  if (adminExists) {
    console.log('✅ Admin account exists. Skipping admin seed.');
    return;
  }

  // 최초 부트스트랩: 환경변수로만 관리자 생성
  const loginId = process.env.ADMIN_LOGIN_ID;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!loginId || !email || !password) {
    console.warn(
      '⚠️  관리자 계정이 없습니다. 최초 1회 ADMIN_LOGIN_ID / ADMIN_EMAIL / ADMIN_PASSWORD 환경변수를 설정하고 재배포하세요.',
    );
    return;
  }
  if (password.length < 10) {
    throw new Error('ADMIN_PASSWORD는 10자 이상이어야 합니다');
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      loginId,
      passwordHash: hash,
      name: '시스템 관리자',
      role: 'ADMIN',
      position: 'OTHER',
      status: 'APPROVED',
      isActive: true,
    },
  });
  console.log(`✅ Admin created (loginId: ${loginId}) — 생성 후 환경변수에서 ADMIN_PASSWORD를 제거하세요.`);
}

async function seedBranches() {
  // 지점이 하나라도 있으면 기존 데이터를 절대 건드리지 않음
  const branchCount = await prisma.branch.count();
  if (branchCount > 0) {
    console.log(`✅ Branches exist (${branchCount}). Skipping branch seed.`);
    return;
  }

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
    const r = await prisma.branch.create({
      data: { name: b.name, code: b.code, sortOrder: b.sortOrder, isActive: true },
    });
    map[b.code] = r.id;
  }
  console.log(`✅ ${branchDefs.length} branches created`);

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

    const rooms = Array.isArray(roomData) ? roomData : roomData.rooms;
    const offices = Array.isArray(roomData) ? [] : roomData.office;

    for (const r of rooms) {
      await prisma.location.create({
        data: { name: `${r}호`, type: 'ROOM', branchId: bid, isActive: true },
      });
      roomCount++;
    }
    for (const r of offices) {
      await prisma.location.create({
        data: { name: `${r}호`, type: 'OFFICE', branchId: bid, isActive: true },
      });
      roomCount++;
    }
  }
  console.log(`✅ ${roomCount} rooms created`);
}

async function main() {
  await seedAdmin();
  await seedBranches();
  console.log('🎉 Production seed complete!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
