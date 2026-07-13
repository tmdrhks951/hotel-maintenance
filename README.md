# 호텔 시설 유지보수 시스템

카카오톡 기반 시설관리 업무를 실제 운영 가능한 시스템으로 대체하는 프로젝트 (총괄방 대체 프로그램).

---

## 기능 개요

- **역할 기반 시스템**: 관리자(ADMIN) / 운영팀(OPERATIONS) / QC팀(QC) / 협력업체(VENDOR) + 팀장/부팀장/팀원 직급
- **시설 보수 워크플로우**: 요청 등록 → QC 수령(예상 소요·정비 필요 입력) → 작업 시작 → 작업 완료(사진 필수) → QC 검증 → 운영팀 확인 → 종료 / 재오픈
- **지점·객실 관리**: 지점 20개 + 객실(Location) 계층, 지점별 필터
- **사진 전/후 업로드**, 댓글(대댓글), 상태 변경 이력, 긴급 지정, 우선순위
- **반복 점검 스케줄**: 일/주/월 반복 — 서버가 10분 주기로 자동 생성 (설정 시각 반영)
- **알림**: 상태 변경/긴급/재오픈/확인요청 알림 + SSE 실시간 반영
- **회원가입 승인제**: 전화번호 인증 → 가입 신청 → 관리자 승인, 관리자 승인형 비밀번호 재설정(임시 비밀번호 발급)
- 공지사항, 작업 이력 + Excel 내보내기, 작업 달력(월별)

## 프로젝트 구조

```
root/
├── backend/          # Express + TypeScript + Prisma (PostgreSQL)
├── frontend/         # Next.js 14 App Router + Tailwind + React Query + Zustand
├── docker-compose.yml  # 로컬 개발용 PostgreSQL/Redis/MinIO
└── .env.example
```

---

## 로컬 실행 가이드

### 1. 인프라

PostgreSQL 16 필수. Docker 사용 시:

```bash
docker compose up -d
```

> Redis는 선택 — 없으면 전화번호 인증코드가 인메모리 폴백으로 동작합니다 (단일 인스턴스 한정).
> MinIO는 현재 미사용 (파일은 `UPLOAD_DIR` 로컬 디스크에 저장).

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # JWT 시크릿 2종(32자+, 서로 다른 값) 반드시 수정
npm run prisma:generate
npx prisma migrate deploy
node prisma/seed-prod.js   # 최초 1회: ADMIN_LOGIN_ID/ADMIN_EMAIL/ADMIN_PASSWORD 환경변수 필요
npm run dev                # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                # http://localhost:3000
```

---

## 환경변수

### backend/.env

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | ✅ (운영 필수) | PostgreSQL 연결 문자열 |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ✅ | 32자 이상, 서로 다른 값 |
| `CORS_ORIGIN` | ✅ (운영 필수) | 프론트엔드 오리진 |
| `REDIS_URL` | 선택 | 없으면 인증코드 인메모리 폴백 |
| `UPLOAD_DIR` | 운영 필수 | 업로드 저장 경로 — 컨테이너 배포 시 영구 볼륨 지정 필수 |
| `ADMIN_LOGIN_ID` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 최초 1회 | 관리자 부트스트랩 (생성 후 제거 권장) |

### frontend/.env.local

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_API_URL` | 백엔드 API 주소 (예: `http://localhost:4000/api/v1`) |

---

## 배포 메모

- 프론트: Vercel (`NEXT_PUBLIC_API_URL` 환경변수 필수 — 빌드 타임에 인라인됨)
- 백엔드: Railway 등 (Procfile: migrate deploy → seed → server)
- **주의**: 업로드 파일은 로컬 디스크 저장 — 영구 볼륨 미지정 시 재배포마다 소실. S3/R2 등 오브젝트 스토리지 전환 권장.
- **SMS 미연동**: 프로덕션에서는 인증코드가 응답에 포함되지 않으므로, 실제 SMS 게이트웨이(알리고/NHN Cloud 등) 연동 전까지 전화번호 인증이 불가.

## 남은 개선 과제

- [ ] 토큰 저장을 localStorage → httpOnly 쿠키로 전환 (XSS 방어)
- [ ] SMS 발송 게이트웨이 연동
- [ ] 파일 저장 S3/오브젝트 스토리지 전환
- [ ] `facility-request.service.ts`(1,859줄), `ActionButtons.tsx`(826줄) 등 거대 파일 분할
- [ ] 레거시 상태값(PENDING/COMPLETED) 마이그레이션 후 제거
- [ ] 테스트 코드 / CI 도입
