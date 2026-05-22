# Mini-Pay

**Mini-Pay**는 NestJS + Prisma + PostgreSQL + Redis를 기반으로 한 간편 송금/정산/적금 페이 서버 프로젝트입니다.

이 프로젝트는 단순히 기능을 구현하는 것을 넘어, **데이터베이스 동시성 제어, 트랜잭션 설계, 대량 데이터 처리, 스케줄링** 등 실제 핀테크 서비스에서 마주치는 핵심 기술 문제를 해결하는 것을 목표로 합니다.

> **학습 목표**: 코드를 막 짜는 것이 아니라, 각 기술 결정의 이유를 고민하며 성능과 안정성을 모두 잡는 백엔드 개발 능력을 기릅니다.

---

## 기술 스택

| 영역 | 기술 | 선택 이유 |
|------|------|----------|
| **Framework** | NestJS | 모듈 기반 아키텍처, DI(의존성 주입), 데코레이터 기반 개발로 대규모 애플리케이션에 적합 |
| **ORM** | Prisma | 타입 안전성, 자동 마이그레이션, 직관적인 쿼리 빌더 |
| **Database** | PostgreSQL | ACID 보장, 동시성 제어(FOR UPDATE), Decimal 타입 지원 |
| **Cache** | Redis | Refresh Token 저장, 세션 관리 |
| **Scheduler** | @nestjs/schedule | Cron 기반 배치 작업 (이자 지급, 만료 처리 등) |
| **Language** | TypeScript | 컴파일 타임 타입 체크, BigInt 원시 지원 |

---

## 프로젝트 구조

```
src/
├── account/           # 계좌 관리, 충전, 이체, 적금, 스케줄러
│   ├── dto/
│   ├── exception/
│   ├── account.controller.ts
│   ├── account.service.ts
│   ├── account.module.ts
│   └── savings.scheduler.ts      # 매일 이자/자동출금 Cron
├── auth/              # JWT 인증 (Access/Refresh Token)
│   ├── dto/
│   ├── exception/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── jwt-auth.guard.ts
│   └── jwt.strategy.ts
├── common/            # 공통 예외, 인터셉터, 유틸리티
│   ├── exception/
│   ├── filters/
│   ├── interceptors/
│   └── utils/
├── prisma/            # Prisma 모듈 (Global)
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── redis/             # Redis 모듈
│   ├── redis.module.ts
│   └── redis.service.ts
├── settlement/        # 정산 기능 (1/n, 랜덤)
│   ├── dto/
│   ├── exception/
│   ├── settlement.controller.ts
│   ├── settlement.service.ts
│   └── settlement.module.ts
├── transfer-request/  # Pending 송금, 수락/거절/취소
│   ├── dto/
│   ├── exception/
│   ├── transfer-request.controller.ts
│   ├── transfer-request.service.ts
│   ├── transfer-request.scheduler.ts  # 72시간 만료 Cron
│   └── transfer-request.module.ts
└── user/              # 회원가입
    ├── dto/
    ├── exception/
    ├── user.controller.ts
    ├── user.service.ts
    └── user.module.ts
```

---

## 핵심 기능 및 기술적 도전

### Step 1. 계좌 세팅 — 동시성 제어의 시작

사용자가 회원가입하면 자동으로 **메인 계좌**가 생성됩니다. 추가로 **적금 계좌**를 만들 수 있고, 외부에서 돈을 충전하거나 메인 계좌에서 적금 계좌로 이체할 수 있습니다.

**기술적 고민:**
- **적금 이체 시 동시성 제어**: 두 계좌의 잔액을 동시에 바꿔야 할 때, 어떻게 데이터 불일치를 방지할까?
  - → `FOR UPDATE` 행 잠금 + 트랜잭션으로 해결
  - → 계좌 ID를 정렬한 후 잠금(Deadlock 방지)
- **일일 충전 한도**: 하루 300만원 제한은 어떻게 관리할까?
  - → `DailyTopUpUsage` 테이블에 `(userId, date)` 복합 키로 Upsert
  - → `increment` 연산으로 Race Condition 방지

**API:**
- `POST /users` — 회원가입 (메인 계좌 자동 생성)
- `POST /auth/login`, `/auth/logout`, `/auth/refresh` — JWT 인증
- `POST /accounts/savings` — 적금 계좌 생성
- `POST /accounts/main/charge` — 메인 계좌 충전 (일일 한도 300만원)
- `POST /accounts/savings/:id/deposit` — 메인 → 적금 이체

---

### Step 2. 송금 기능 — 락 경합 최소화와 거래 기록

친구의 메인 계좌로 송금할 수 있습니다. 잔액이 부족하면 **10,000원 단위로 자동 충전**한 뒤 송금이 이루어집니다.

**기술적 고민:**
- **동시에 100명이 한 계좌로 송금한다면?**
  - → 송금자 계좌만 `FOR UPDATE`로 잠금 (범위 최소화)
  - → 수신자 계좌는 `increment`로 업데이트 (락 없이 안전)
- **거래 내역은 어떻게 설계할까?**
  - → 2줄 기록 방식 (출금/입금 각각) + `groupId`로 묶음
  - → `counterpartyName`을 Denormalization하여 조회 성능 최적화

**API:**
- `POST /accounts/transfer` — 사용자 간 송금 (자동 충전 포함)
- `GET /accounts/:accountId/transactions` — 계좌별 거래 내역

---

### Step 3. 정산 기능 — 금액의 정확한 분배

사용자가 원하는 사람들에게 정산을 요청할 수 있습니다. **1/n 정산**과 **랜덤 정산** 두 가지 방식을 지원합니다.

**기술적 고민:**
- **20,000원을 3명이 1/n으로 나누면?**
  - → 6,666 + 6,667 + 6,667 = 20,000원 (나머지 2원을 Fisher-Yates 셔플로 무작위 배분)
  - → 총액이 정확히 맞아야 함 (절대 1원도 차이나면 안 됨)
- **랜덤 정산은 최소 금액을 어떻게 보장할까?**
  - → 참여자당 최소 100원씩 확보 후 나머지를 랜덤 배분
- **정산 송금은 실제 돈이 움직여야 함**
  - → 참여자가 송금하면 실제 계좌 잔액 차감 + 방장 계좌 입금
  - → 모두 납부 완료 시 자동으로 정산 COMPLETED 처리

**API:**
- `POST /settlements` — 정산 생성 (EQUAL / RANDOM)
- `POST /settlements/:id/pay` — 정산 송금 (실제 계좌 이체)
- `GET /settlements` — 내가 참여한 / 생성한 정산 목록

---

### Step 4. 송금 기능 구조 변경 — Pending 상태와 시간 제한

이제 송금 시 바로 돈이 이동하지 않을 수도 있습니다. **수신자가 직접 수락**해야 돈을 받는 **Pending 송금**이 도입되었습니다.

**기술적 고민:**
- **Pending 금액은 어디에 있나?**
  - → 송금자의 `balance`에서 즉시 차감 (사용 불가능한 상태)
  - → 별도 `frozenBalance` 컬럼 없이 기존 잔액 필드만으로 관리
- **72시간 후 자동 만료는 어떻게 처리할까?**
  - → `@nestjs/schedule`로 매시간 Cron Job 실행
  - → `expiresAt` + `status` 인덱스로 빠른 만료 대상 조회
  - → 만료 시 송금자에게 자동 환불
- **24시간 전 알림**
  - → `remindedAt` 플래그로 중복 알림 방지

**API:**
- `POST /accounts/transfer` (body에 `mode: REQUIRE_CONFIRM`) — Pending 송금 요청
- `GET /transfer-requests/received?status=PENDING` — 받은 송금 요청
- `GET /transfer-requests/sent` — 보낸 송금 요청
- `POST /transfer-requests/:id/accept` — 수락 (실제 이체 완료)
- `POST /transfer-requests/:id/reject` — 거절 (송금자 환불)
- `POST /transfer-requests/:id/cancel` — 취소 (본인 환불)

---

### Step 5. 적금 기능 — 시간 기반 배치 처리

적금 계좌가 드디어 제 기능을 합니다. **정기 적금**은 매일 자동으로 돈이 들어가고, **자유 적금**은 원할 때 입금할 수 있습니다. 매일 이자가 쌓입니다.

**기술적 고민:**
- **매일 이자를 계산하려면?**
  - → `balance * interestRate / 365` 일별 단리 계산
  - → `lastInterestAt`으로 중복 지급 방지
- **정기 출금 실패 시 어떻게 할까?**
  - → 자동충전 ❌ (사용자 동의 없는 충전은 문제)
  - → 잔액 부족 시 **스킵**, 다음 날 다시 시도
- **Cron 스케줄러 설계**
  - → 오전 4시: 전체 적금 이자 지급
  - → 오전 8시: 정기 적금 자동 출금

**API:**
- `POST /accounts/savings` (body에 `productType: FIXED/FLEXIBLE`, `targetAmount`) — 적금 계좌 생성
- 기존 `POST /accounts/savings/:id/deposit` — 자유 적금 수동 입금

---

## ERD 주요 모델 관계

```
User
├── accounts: Account[]           # 사용자의 모든 계좌
├── settlements: Settlement[]      # 사용자가 요청한 정산
└── dailyTopUpUsages: DailyTopUpUsage[]  # 일일 충전 한도 추적

Account
├── user: User                    # 계좌 소유자
├── transactions: Transaction[]   # 이 계좌의 거래 내역
├── sentTransferRequests: TransferRequest[]      # 내가 보낸 Pending 송금
├── receivedTransferRequests: TransferRequest[]  # 내가 받은 Pending 송금
├── productType: FIXED | FLEXIBLE  # (적금 전용) 상품 구분
├── targetAmount: BigInt           # (정기 적금) 매일 출금액
├── interestRate: Decimal          # (적금) 단리 이자율 (0.05 = 5%)
└── lastInterestAt: DateTime       # (적금) 마지막 이자 지급일

Transaction
├── account: Account              # 거래가 발생한 계좌
├── type: CHARGE | TRANSFER_OUT | TRANSFER_IN | WITHDRAW
├── amount: BigInt                # 거래 금액 (출금은 음수)
├── balanceAfter: BigInt          # 거래 후 잔액
└── groupId: String?              # 같은 이체 건을 묶는 ID

Settlement
├── requester: User               # 정산 방장
├── participants: SettlementParticipant[]  # 참여자들
├── totalAmount: BigInt           # 총 정산 금액
└── type: EQUAL | RANDOM          # 정산 방식

TransferRequest
├── senderAccount: Account        # 송금자 계좌
├── recipientAccount: Account     # 수신자 계좌
├── amount: BigInt                # 송금 금액
├── status: PENDING | ACCEPTED | REJECTED | EXPIRED | CANCELLED
└── expiresAt: DateTime           # 만료 시한 (72시간)
```

---

## 실행 방법

### 1. 환경 설정

```bash
# .env 파일 생성
cat > .env << EOF
DATABASE_URL=postgresql://mini_pay:mini_pay_password@localhost:5432/mini_pay
EOF
```

### 2. Docker로 PostgreSQL + Redis 실행

```bash
docker-compose up -d
```

### 3. 의존성 설치 및 DB 설정

```bash
# 의존성 설치
pnpm install

# DB 마이그레이션
npx prisma migrate dev

# Prisma Client 생성
npx prisma generate
```

### 4. 서버 실행

```bash
# 개발 모드 (hot reload)
pnpm run start:dev

# 프로덕션 모드
pnpm run build
pnpm run start:prod
```

---

## 주요 설계 결정 및 근거

| 주제 | 결정 | 근거 |
|------|------|------|
| **트랜잭션 격리 수준** | PostgreSQL 기본 (Read Committed) | `FOR UPDATE`로 명시적 잠금 + 짧은 트랜잭션 범위로 Phantom Read 방지 |
| **송금 시 잠금 전략** | 송금자만 `FOR UPDATE`, 수신자는 `increment` | 동시에 100명이 한 계좌로 송금해도 수신자 락 경합 최소화 |
| **정산 금액 분배** | EQUAL: Fisher-Yates 셔플 + 나머지 1원 배분 / RANDOM: 최소 100원 보장 | 총액 100% 정확히 일치, 사용자 기대치 충족 |
| **Pending 잔액 관리** | `frozenBalance` 컬럼 없이 `balance`에서 차감 | 스키마 단순화, 대부분의 금융사도 예약 잔액을 동일 필드로 관리 |
| **적금 자동 출금 실패** | 스킵 (자동충전 없음) | 사용자 동의 없는 충전은 규제/법적 문제 가능성 |
| **거래 내역 설계** | 2줄 기록 (Method 2) + `groupId` + `counterpartyName` | 감사 추적성 + 조회 성능 동시 달성 (Denormalization) |
| **스케줄러 구현** | `@nestjs/schedule` Cron (DB 폴링) | 단일 서버 기준으로 가장 단순하고 안정적, Bull은 오버엔지니어링 |

---

## API 엔드포인트 전체 목록

### 인증
| Method | Endpoint | 설명 |
|--------|----------|------|
| `POST` | `/users` | 회원가입 (메인 계좌 자동 생성) |
| `POST` | `/auth/login` | 로그인 (Access + Refresh Token 발급) |
| `POST` | `/auth/logout` | 로그아웃 (Refresh Token 삭제) |
| `POST` | `/auth/refresh` | Access Token 재발급 |

### 계좌
| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/accounts` | 내 계좌 목록 조회 |
| `POST` | `/accounts/savings` | 적금 계좌 생성 (FIXED/FLEXIBLE 선택) |
| `POST` | `/accounts/main/charge` | 메인 계좌 충전 (일일 한도 300만원) |
| `POST` | `/accounts/savings/:id/deposit` | 메인 계좌 → 적금 계좌 이체 |
| `POST` | `/accounts/transfer` | 사용자 간 송금 (INSTANT / REQUIRE_CONFIRM) |
| `GET` | `/accounts/:accountId/transactions` | 계좌별 거래 내역 조회 |

### 정산
| Method | Endpoint | 설명 |
|--------|----------|------|
| `POST` | `/settlements` | 정산 생성 (EQUAL / RANDOM) |
| `POST` | `/settlements/:id/pay` | 정산 송금 (실제 계좌 이체) |
| `GET` | `/settlements` | 내가 참여한 / 생성한 정산 목록 |

### 송금 요청 (Pending Transfer)
| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/transfer-requests/received?status=PENDING` | 받은 송금 요청 목록 |
| `GET` | `/transfer-requests/sent` | 보낸 송금 요청 목록 |
| `POST` | `/transfer-requests/:id/accept` | 송금 수락 (실제 이체 완료) |
| `POST` | `/transfer-requests/:id/reject` | 송금 거절 (송금자 환불) |
| `POST` | `/transfer-requests/:id/cancel` | 송금 취소 (본인 환불) |

---

## 학습 자료 (블로그)

프로젝트를 진행하며 작성한 기술 블로그 글:

- [데이터베이스 설계와 쿼리 최적화](docs/blog-db-design.md)
- [동시성 제어와 트랜잭션 설계](docs/blog-db-concurrency-general.md)

---

> **과제 출처**: C4-Cometrue Mini-Pay Assignment
