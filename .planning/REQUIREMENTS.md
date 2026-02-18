# Requirements: BAY Mileage Store

**Defined:** 2026-02-18
**Core Value:** 온체인에 기록된 '사실' 하나만으로 오프체인 교환이 성립될 수 있음을 직접 경험한다.

## v1 Requirements

### Token

- [ ] **TOK-01**: BAY SPL Token (decimals=6)이 Solana devnet에 배포되어 있다
- [ ] **TOK-02**: 테스트 지갑에 BAY 토큰이 민팅되어 있다

### Catalog

- [ ] **CAT-01**: 운영자가 상품을 온체인에 등록할 수 있다 (이름, 가격(BAY), 재고)
- [ ] **CAT-02**: 상품 목록과 가격을 온체인에서 읽을 수 있다

### Purchase

- [ ] **PUR-01**: 학회원이 특정 상품을 선택해 BAY 토큰을 소각(burn)하는 구매 트랜잭션을 전송할 수 있다
- [ ] **PUR-02**: 구매 성공 시 온체인에 구매 기록(PDA)이 생성된다 (구매자, 상품, 타임스탬프)
- [ ] **PUR-03**: 잔액 부족 시 구매 트랜잭션이 실패한다

### Client

- [ ] **CLI-01**: 사용자가 상품 목록과 가격을 조회할 수 있다
- [ ] **CLI-02**: 사용자가 구매 명령을 실행할 수 있다 (지갑 연결 → burn → 결과 확인)
- [ ] **CLI-03**: 특정 지갑의 구매 기록을 온체인에서 조회할 수 있다

## v2 Requirements

### Operations

- **OPS-01**: 운영자가 상품 재고를 수정할 수 있다
- **OPS-02**: 구매 이력 전체를 조회하는 관리자 뷰

## Out of Scope

| Feature | Reason |
|---------|--------|
| 사용자 인증 / 멤버십 | 오프체인 교환 구조상 필요 없음 |
| 중복 교환 방지 | 임원진의 오프라인 판단에 위임 |
| 자동 환불 / 자동 정산 | 실험 프로젝트 범위 초과 |
| 보안 강화 / 공격 대응 | 학습·장난 목적 프로젝트 |
| Mainnet 배포 | Testnet only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOK-01 | Phase 1 | Pending |
| TOK-02 | Phase 1 | Pending |
| CAT-01 | Phase 2 | Pending |
| CAT-02 | Phase 2 | Pending |
| PUR-01 | Phase 2 | Pending |
| PUR-02 | Phase 2 | Pending |
| PUR-03 | Phase 2 | Pending |
| CLI-01 | Phase 3 | Pending |
| CLI-02 | Phase 3 | Pending |
| CLI-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-18*
*Last updated: 2026-02-18 after initial definition*
