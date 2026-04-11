# 호텔 시설 유지보수 시스템

카카오톡 기반 시설관리 업무를 실제 운영 가능한 시스템으로 대체하는 프로젝트.

---

## 프로젝트 구조

```
root/
├── backend/          # Express + TypeScript
├── frontend/         # Next.js 14 App Router
├── docker-compose.yml
└── .env.example
```

---

## STEP 1 — 로컬 실행 가이드

### 1. 인프라 기동 (Docker)

```bash
docker compose up -d
```

| 서비스   | 주소                          |
|----------|-------------------------------|
| PostgreSQL | localhost:5432              |
| Redis    | localhost:6379                |
| MinIO API | localhost:9000               |
| MinIO Console | http://localhost:9001    |

> MinIO 콘솔 기본 계정: `minioadmin` / `minioadmin`

---

### 2. Backend 실행

```bash
cd backend

# 1) 패키지 설치
npm install

# 2) 환경변수 파일 생성
cp .env.example .env

# 3) Prisma 클라이언트 생성 (DB 없어도 실행 가능)
npm run prisma:generate

# 4) 개발 서버 실행
npm run dev
```

서버 확인: http://localhost:4000/api/v1/health

---

### 3. Frontend 실행

```bash
cd frontend

# 1) 패키지 설치
npm install

# 2) 환경변수 파일 생성
cp .env.local.example .env.local

# 3) 개발 서버 실행
npm run dev
```

화면 확인: http://localhost:3000

---

## 환경변수 요약

| 파일 | 설명 |
|------|------|
| `backend/.env` | `backend/.env.example` 복사 후 수정 |
| `frontend/.env.local` | `frontend/.env.local.example` 복사 후 수정 |

---

## 현재 STEP

| STEP | 내용 | 상태 |
|------|------|------|
| STEP 1 | 프로젝트 뼈대 / 공통 세팅 / 로컬 실행 | ✅ |
| STEP 2 | Prisma 도메인 모델 / Auth / JWT | 예정 |
| STEP 3~ | 도메인 API / 프론트 화면 | 예정 |
