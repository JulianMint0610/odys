# ADR-006 — Supabase

- Status: Accepted
- Date: 2026-08-10

---

## 01. Context

ODYS는 초기 제품 단계에서 PostgreSQL database, authentication, user identity, storage, secure server-side access, migration management가 필요하다.

초기부터 데이터베이스, 인증 서버, object storage를 모두 별도로 구축하면 제품 기능보다 인프라 구축에 많은 시간이 소요된다.

반대로 특정 Backend-as-a-Service의 고유 기능에 과도하게 종속되면 장기적인 이동성이 낮아질 수 있다.

---

## 02. Decision

ODYS의 초기 데이터 플랫폼으로 **Supabase**를 사용한다.

우선 활용 기능:

- PostgreSQL Database
- Authentication
- Storage
- Row Level Security
- Migration workflow
- Server-side access

다만 ODYS의 domain model과 business logic은 가능한 한 Supabase SDK 자체에 종속되지 않도록 한다.

---

## 03. Data Ownership Principle

ODYS의 핵심 데이터 모델은 Supabase가 아니라 **PostgreSQL schema**를 기준으로 설계한다.

```text
Domain
  ↓
Repository / Data Access Contract
  ↓
Supabase Adapter
  ↓
PostgreSQL
```

애플리케이션 전체에서 Supabase SDK를 직접 호출하는 구조를 피한다.

---

## 04. Authentication

Supabase Auth를 초기 인증 기반으로 사용할 수 있다.

```text
External Auth Identity
        ↓
ODYS User Identity
        ↓
Core / Pack
```

Pack이 Supabase user object에 직접 의존하지 않도록 한다.

---

## 05. Row Level Security

사용자 데이터가 직접 노출될 수 있는 접근 경로에는 RLS를 적극적으로 사용한다.

기본 원칙:

- deny by default
- 최소 권한
- 사용자별 데이터 격리
- service role key는 server-side에서만 사용
- client에서 admin credential 사용 금지

RLS는 application-level authorization을 완전히 대체하지 않는다.

---

## 06. Migration Policy

스키마 변경은 재현 가능한 migration으로 관리한다.

금지:

- production database에서 수동으로만 변경
- 기록되지 않은 schema 수정
- local schema와 production schema의 장기 불일치

모든 중요한 schema 변경은 Git에서 추적 가능해야 한다.

---

## 07. Rationale

### 7.1 PostgreSQL Foundation

표준적이고 성숙한 관계형 데이터베이스를 기반으로 한다.

### 7.2 Development Speed

인증, DB, Storage를 별도로 구축하는 시간을 줄일 수 있다.

### 7.3 Escape Path

핵심 데이터가 PostgreSQL에 있으므로 전용 proprietary database보다 이동 가능성이 높다.

### 7.4 Security Features

RLS와 인증 기능을 활용해 초기 보안 구조를 빠르게 구축할 수 있다.

---

## 08. Alternatives Considered

### Alternative A — Raw PostgreSQL + Custom Auth

제어권은 높지만 초기 개발 비용과 운영 부담이 크다.

현재는 채택하지 않는다.

### Alternative B — Firebase

빠른 개발 경험은 강하지만 ODYS의 관계형 데이터 모델과 장기적인 PostgreSQL portability 측면에서 우선순위가 낮다.

채택하지 않는다.

### Alternative C — Managed PostgreSQL + 별도 Auth

구성 요소별 선택 자유도는 높지만 초기 통합 비용이 증가한다.

현재는 Supabase의 통합된 개발 경험을 우선한다.

---

## 09. Consequences

### Positive

- 초기 개발 속도가 빨라진다.
- PostgreSQL 기반 relational model을 사용할 수 있다.
- 인증과 Storage를 빠르게 연결할 수 있다.
- RLS를 활용할 수 있다.

### Negative

- Supabase API와 운영 방식에 일부 종속된다.
- 잘못 사용하면 SDK가 전체 코드에 퍼질 수 있다.
- BaaS의 pricing / limit 변화 영향을 받을 수 있다.

---

## 10. Constraints

- service role key를 client에 노출하지 않는다.
- secret은 repository에 commit하지 않는다.
- database migration을 Git에서 관리한다.
- Pack이 Supabase SDK에 직접 의존하지 않도록 한다.
- 데이터 접근은 가능한 한 repository / adapter 계층을 사용한다.
- 개인정보와 민감 데이터는 최소 수집 원칙을 따른다.

---

## 11. Revisit Conditions

- Supabase 비용이 서비스 규모에 비해 비효율적이 될 때
- 특정 지역 또는 규제 요구를 충족하지 못할 때
- 자체 인프라 운영이 경제적으로 유리해질 때
- 독립적인 Database / Auth / Storage 서비스가 필요해질 때

---

## 12. Related Documents

- `ADR-003-modular-monolith.md`
- `../20_architecture/DATA_MODEL.md`
- `../20_architecture/SECURITY_ARCHITECTURE.md`
- `../20_architecture/DEPLOYMENT.md`
- `../20_architecture/TECH_STACK.md`

---

## 13. Development Rule

Supabase는 ODYS의 개발 속도를 높이는 플랫폼이지 ODYS의 domain architecture 자체가 아니다.

**Use Supabase for acceleration. Keep the domain portable.**
