// Production seed — plain JS, no ts-node needed
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst({ where: { email: 'admin@hotel.com' } });
  if (existing) {
    console.log('✅ Seed already applied. Skipping.');
    return;
  }

  // 1. Admin
  const hash = await bcrypt.hash('Admin@1234!', 12);
  await prisma.user.create({
    data: {
      email: 'admin@hotel.com', loginId: 'admin', passwordHash: hash,
      name: '시스템 관리자', role: 'ADMIN', position: 'OTHER', isActive: true,
    },
  });
  console.log('✅ Admin created');

  // 2. Branches
  const branches = [
    { name: 'SOA', code: 'SOA', sortOrder: 1 },
    { name: '카와우소 1호점 (사당)', code: 'KAWAUSO1', sortOrder: 2 },
    { name: '카와우소 2호점 (명동)', code: 'KAWAUSO2', sortOrder: 3 },
    { name: '카와우소 3호점 (덕수궁)', code: 'KAWAUSO3', sortOrder: 4 },
    { name: '국도빌딩', code: 'GUKDO', sortOrder: 5 },
    { name: '명동점', code: 'MYEONGDONG', sortOrder: 10 },
    { name: '덕수궁점', code: 'DEOKSUGUNG', sortOrder: 20 },
    { name: '사당점', code: 'SADANG', sortOrder: 30 },
  ];

  const map = {};
  for (const b of branches) {
    const r = await prisma.branch.create({ data: { name: b.name, code: b.code, sortOrder: b.sortOrder, isActive: true } });
    map[b.code] = r.id;
  }

  const children = [
    { name: '명동 1호점', code: 'MYEONGDONG1', sortOrder: 11, parent: 'MYEONGDONG' },
    { name: '명동 2호점', code: 'MYEONGDONG2', sortOrder: 12, parent: 'MYEONGDONG' },
    { name: '명동 3호점', code: 'MYEONGDONG3', sortOrder: 13, parent: 'MYEONGDONG' },
    { name: '덕수궁 1호점', code: 'DEOKSUGUNG1', sortOrder: 21, parent: 'DEOKSUGUNG' },
    { name: '덕수궁 2호점', code: 'DEOKSUGUNG2', sortOrder: 22, parent: 'DEOKSUGUNG' },
    { name: '사당 1호점', code: 'SADANG1', sortOrder: 31, parent: 'SADANG' },
  ];

  for (const c of children) {
    const r = await prisma.branch.create({
      data: { name: c.name, code: c.code, sortOrder: c.sortOrder, isActive: true, parentId: map[c.parent] },
    });
    map[c.code] = r.id;
  }
  console.log(`✅ ${Object.keys(map).length} branches created`);

  // 3. Locations
  const locs = [
    { name: '101호', type: 'ROOM' }, { name: '102호', type: 'ROOM' }, { name: '103호', type: 'ROOM' },
    { name: '201호', type: 'ROOM' }, { name: '202호', type: 'ROOM' }, { name: '203호', type: 'ROOM' },
    { name: '301호', type: 'ROOM' }, { name: '302호', type: 'ROOM' },
    { name: '로비', type: 'PUBLIC_AREA' }, { name: '복도', type: 'PUBLIC_AREA' },
    { name: '엘리베이터', type: 'PUBLIC_AREA' }, { name: '화장실(공용)', type: 'PUBLIC_AREA' },
    { name: '사무실', type: 'OFFICE' },
    { name: '직원휴게실', type: 'BACK_OF_HOUSE' }, { name: '세탁실', type: 'BACK_OF_HOUSE' }, { name: '기계실', type: 'BACK_OF_HOUSE' },
  ];

  const activeCodes = ['SOA','KAWAUSO1','KAWAUSO2','KAWAUSO3','GUKDO','MYEONGDONG1','MYEONGDONG2','MYEONGDONG3','DEOKSUGUNG1','DEOKSUGUNG2','SADANG1'];
  let count = 0;
  for (const code of activeCodes) {
    if (!map[code]) continue;
    for (const l of locs) {
      await prisma.location.create({ data: { name: l.name, type: l.type, branchId: map[code], isActive: true } });
      count++;
    }
  }
  console.log(`✅ ${count} locations created`);
  console.log('🎉 Production seed complete!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
