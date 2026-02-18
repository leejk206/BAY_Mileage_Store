# Roadmap: BAY Mileage Store

**Milestone:** v1.0
**Total Phases:** 3
**Total Requirements:** 10

## Phase Overview

| # | Phase | Goal | Requirements | Status |
|---|-------|------|--------------|--------|
| 1 | Foundation | Anchor 프로젝트 초기화 + BAY SPL Token devnet 배포 | TOK-01, TOK-02 | Pending |
| 2 | Program Core | 온체인 상품 카탈로그 + burn 구매 로직 구현 | CAT-01, CAT-02, PUR-01, PUR-02, PUR-03 | Pending |
| 3 | Client | 상품 조회·구매·기록 조회 CLI 스크립트 | CLI-01, CLI-02, CLI-03 | Pending |

---

## Phase 1: Foundation

**Goal:** Anchor 프로젝트가 초기화되어 있고, BAY SPL Token이 devnet에 배포되어 있으며, 테스트 지갑에 토큰이 민팅되어 있다.

**Requirements:**
- TOK-01: BAY SPL Token (decimals=6)이 Solana devnet에 배포되어 있다
- TOK-02: 테스트 지갑에 BAY 토큰이 민팅되어 있다

**Success Criteria:**
1. `anchor build` 가 성공하고 프로그램 ID가 생성된다
2. `spl-token create-token --decimals 6` 으로 BAY mint가 devnet에 존재한다
3. 지정된 테스트 지갑이 BAY 잔액 > 0을 보유하고 있다

---

## Phase 2: Program Core

**Goal:** Anchor 프로그램에서 운영자가 상품을 등록할 수 있고, 학회원이 BAY를 소각해 구매할 수 있으며, 구매 기록이 온체인 PDA에 저장된다.

**Requirements:**
- CAT-01: 운영자가 상품을 온체인에 등록할 수 있다 (이름, 가격(BAY), 재고)
- CAT-02: 상품 목록과 가격을 온체인에서 읽을 수 있다
- PUR-01: 학회원이 BAY 토큰을 소각(burn)하는 구매 트랜잭션을 전송할 수 있다
- PUR-02: 구매 성공 시 온체인에 구매 기록(PDA)이 생성된다 (구매자, 상품, 타임스탬프)
- PUR-03: 잔액 부족 시 구매 트랜잭션이 실패한다

**Success Criteria:**
1. `add_item` instruction이 성공하면 ItemAccount PDA가 온체인에 존재한다
2. `purchase` instruction이 성공하면 구매자 BAY 잔액이 가격만큼 감소한다
3. `purchase` 성공 후 PurchaseRecord PDA가 구매자/상품/타임스탬프를 담고 있다
4. 잔액 부족 상태에서 `purchase` 호출 시 에러를 반환한다

---

## Phase 3: Client

**Goal:** 사용자가 CLI 스크립트로 상품을 조회하고, 구매를 실행하고, 구매 기록을 확인할 수 있다.

**Requirements:**
- CLI-01: 사용자가 상품 목록과 가격을 조회할 수 있다
- CLI-02: 사용자가 구매 명령을 실행할 수 있다 (지갑 연결 → burn → 결과 확인)
- CLI-03: 특정 지갑의 구매 기록을 온체인에서 조회할 수 있다

**Success Criteria:**
1. `ts-node client/list-items.ts` 실행 시 상품 목록이 출력된다
2. `ts-node client/buy.ts <item_id>` 실행 시 burn 트랜잭션이 전송되고 tx signature가 출력된다
3. `ts-node client/history.ts <wallet>` 실행 시 해당 지갑의 구매 기록이 출력된다

---
*Roadmap created: 2026-02-18*
*Last updated: 2026-02-18 after initial creation*
