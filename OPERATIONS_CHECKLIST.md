## BAY Mileage Store — 행사 리허설 체크리스트

온체인 마일리지 샵을 실제 행사에서 운영하기 전에, 아래 순서대로 **end-to-end 리허설**을 진행합니다.  
(네트워크는 모두 **Solana Devnet** 기준입니다.)

---

### 1) 프로그램 배포 & 스토어 초기화

1. **환경 확인**
   - 루트 `.env` 에 다음 값이 설정되어 있는지 확인:
     - `BAY_MINT` (devnet BAY SPL mint)
     - `PROGRAM_ID` (배포할 프로그램 ID)
     - `STORE_CONFIG_PDA` (이미 초기화된 경우)
   - `Anchor.toml`:
     - `[provider].cluster = "devnet"`
     - `[programs.devnet].bay_mileage_store` 가 `declare_id!` 와 동일한지 확인.

2. **프로그램 빌드 & 배포**
   - 루트에서:
     - `anchor build`
     - `anchor deploy`
   - 배포 로그에 출력된 Program Id가 `.env` 의 `PROGRAM_ID` 와 동일한지 확인.

3. **스토어 초기화 (`initialize_store`)**
   - 조건: 아직 `StoreConfig` PDA 가 생성되지 않은 상태이거나, devnet 을 새로 리셋한 경우.
   - 방법 A: 테스트 스크립트 활용
     - 루트에서 `yarn test` 를 실행해 smoke 테스트의 `a) initialize_store` 통과 확인.
   - 방법 B: Anchor CLI / 자체 스크립트
     - `storeConfig = STORE_CONFIG_PDA`
     - `bayMint = BAY_MINT`
     - `authority = 운영자 지갑(pubkey)`
   - 완료 후:
     - `.env` 의 `STORE_CONFIG_PDA` 값과 온체인 PDA 주소가 일치하는지 확인.

---

### 2) 아이템 등록 (카탈로그 세팅)

목표: 행사에서 사용할 기본 상품들을 온체인 `StoreItem` 으로 등록합니다.

1. **관리자 지갑 확인**
   - `.env` 의 `STORE_CONFIG_PDA` 를 기준으로 on-chain `StoreConfig.authority` 가 어떤 지갑인지 확인.
   - 이 지갑을 브라우저 지갑(Phantom 등)에서 선택.

2. **웹 dApp 실행**
   - 루트에서:
     - `cd web`
     - `yarn dev`
   - 브라우저에서 `http://localhost:3000/admin` 접속 후 지갑 연결.

3. **권한 확인**
   - `/admin` 페이지 상단에:
     - `Store authority` 가 현재 지갑 주소와 동일하면 “Admin” 영역 활성화.
     - 다르면 “Not authorized” 메시지가 보이는지 확인.

4. **상품 추가 (Add Item 폼)**
   - `/admin` 의 **Add Item** 섹션에서:
     - `Name (≤ 32)`: 예) `StickerPack`, `T-Shirt`, `Badge`
     - `Price (BAY)`: 예) `5`, `10` (코드 내부에서 `BAY * 1_000_000` 으로 변환)
     - `Stock`: 예) `20`, `50`
   - **제출 후 확인**:
     - 에러가 없고 성공적으로 트랜잭션이 끝나는지 확인.
     - `/` (Catalog) 페이지로 이동해 새 아이템이 보이는지, 가격/재고가 기대값과 같은지 확인.

---

### 3) BAY 토큰 에어드랍 (샘플 지갑 준비)

목표: 몇 개의 테스트 지갑에 BAY 토큰을 배포해 구매 리허설에 사용합니다.

1. **CSV 파일 준비**
   - `scripts/recipients.csv` 예시:

   ```csv
   wallet,points
   <지갑1>,10
   <지갑2>,25
   ```

   - `wallet`: 테스트용 Phantom 지갑 주소.
   - `points`: 에어드랍할 포인트 수 (스크립트 내부에서 `1 point = 1 BAY = 1_000_000 raw` 로 변환).

2. **연산자(운영자) 지갑 준비**
   - `.env` 의 `BAY_MINT` 에 대해 충분한 BAY 를 보유한 지갑이 필요.
   - `ANCHOR_WALLET` 또는 OS 기본 경로 (`C:/solana/id.json` / `~/.config/solana/id.json`) 가 이 지갑을 가리키는지 확인.

3. **에어드랍 실행**
   - 루트에서:

   ```bash
   yarn airdrop:bay --file scripts/recipients.csv
   ```

   - 스크립트는 각 지갑에 대해:
     - BAY ATA 없으면 생성
     - `points * RAW_PER_POINT` 만큼 BAY 전송
   - 출력에서 확인:
     - 총 recipient 수
     - 총 전송된 BAY
     - 지갑별 트랜잭션 시그니처
   - 각 테스트 지갑에서 Devnet RPC 또는 Explorer로 BAY 잔액을 확인.

---

### 4) 웹 dApp에서 사용자 구매 리허설

목표: 실제 행사 참가자가 수행할 플로우를 테스트 지갑으로 재현합니다.

1. **테스트 지갑 준비**
   - Phantom/솔라나 지갑 앱에서 devnet 네트워크 선택.
   - 에어드랍 받은 BAY 토큰이 보이는지 확인.

2. **카탈로그 페이지 접속**
   - `http://localhost:3000/` 에 접속, 테스트 지갑으로 **지갑 연결**.
   - 상단에:
     - `Your BAY balance: ... BAY` 가 올바르게 표시되는지 확인.

3. **상품 선택 및 구매**
   - 재고가 1 이상인 상품 카드에서 **Buy** 버튼 클릭.
   - 지갑 팝업에서 트랜잭션 서명.
   - 페이지에 “Last purchase tx” 링크가 나타나고, Solana Explorer(devnet) 링크로 이동 가능한지 확인.
   - 구매 후:
     - 해당 상품의 `Stock` 이 1 줄어든 값으로 업데이트 되었는지 확인.
     - 상단 BAY 잔액이 구매 가격만큼 감소했는지 확인.

---

### 5) 참가자 — 트랜잭션 서명 제출 플로우

실제 행사에서 참가자는 다음을 수행합니다.

1. **웹 dApp에서 구매 완료 후**
   - `Last purchase tx` 에 표시된 **트랜잭션 시그니처**를 복사.
   - 또는 지갑 UI에서 최근 트랜잭션 ID를 복사.

2. **오프라인 교환 장소에서**
   - 운영자에게 트랜잭션 시그니처를 제시 (텍스트/QR 등).

---

### 6) 운영자 — Explorer에서 검증 절차 (devnet)

목표: 오프라인에서 시그니처 하나만 보고 구매를 검증합니다.

1. **트랜잭션 조회**
   - `https://explorer.solana.com/tx/<signature>?cluster=devnet` 열기.

2. **프로그램 인스트럭션 확인**
   - 트랜잭션 상세에서:
     - 호출된 Program Id 가 `BAY Mileage Store` Program Id (`PROGRAM_ID`) 와 일치하는지 확인.
     - Instruction 이름이 `purchase` 인지 확인.

3. **토큰 소각(token burn) 확인**
   - Transaction logs 또는 Token balance changes에서:
     - BAY 토큰이 **사용자 지갑 → 소각(Burn)** 형태로 감소했는지 확인.
     - 감소한 BAY 양이 상품 가격과 일치하는지 확인.

4. **아이템 재고 감소 확인 (선택)**
   - 추가적으로 검증하고 싶을 때:
     - 트랜잭션 이전/이후의 `StoreItem` 계정을 비교하거나,
     - 웹 dApp `/` 페이지에서 해당 상품 재고가 1 감소했는지 눈으로 확인.

5. **모든 조건 만족 시**
   - 오프라인에서 실물 상품을 교환해 줍니다.

---

### 7) 엣지 케이스 리허설

#### 7-1. 잔액 부족 (Insufficient Funds)

1. **조건 만들기**
   - BAY 잔액이 상품 가격보다 작은 테스트 지갑 준비 (에어드랍 적게 하거나, 의도적으로 BAY 를 사용).
2. **시도**
   - `/` 페이지에서 해당 지갑으로 상품 구매 시도.
3. **기대 결과**
   - 지갑 트랜잭션이 실패하거나, 웹 dApp 에서 에러 메시지 표시.
   - 온체인에서는 `InsufficientFunds` 커스텀 에러가 발생 (프로그램 로깅으로 확인 가능).
   - BAY 잔액/재고/영수증 모두 변경되지 않아야 함.

#### 7-2. 재고 부족 (Out of Stock)

1. **조건 만들기**
   - 어떤 상품의 `Stock` 을 `/admin` 페이지 또는 온체인 상에서 `0` 으로 맞춘다.
2. **시도**
   - `/` 페이지에서 해당 상품 카드 확인:
     - `Out of stock` 태그가 보이고, `Buy` 버튼이 `Sold out` 이거나 비활성 상태인지 확인.
   - 강제로 구매 트랜잭션을 보내려 해도:
     - 온체인에서 `OutOfStock` 커스텀 에러로 실패해야 함.
3. **기대 결과**
   - BAY 잔액/재고/영수증 변화 없음.

#### 7-3. 같은 상품 반복 구매 (Repeat Purchase)

1. **조건 만들기**
   - 동일 지갑에 충분한 BAY 를 에어드랍.
   - 해당 상품의 재고가 2 이상인지 확인.
2. **시도**
   - `/` 페이지에서 같은 상품에 대해 **두 번 이상** `Buy` 실행.
3. **기대 결과**
   - 두 번 모두 트랜잭션 성공.
   - `/my-purchases` 페이지에서:
     - 같은 `item` 에 대해 **여러 개의 PurchaseReceipt** 가 보임.
     - `purchase_index` 가 0, 1, 2,... 순서대로 증가.
   - 상품 `Stock` 이 구매 횟수만큼 감소.
   - 지갑 BAY 잔액이 `구매 횟수 × 상품 가격` 만큼 감소.

---

이 체크리스트를 **행사 전 최소 1회 이상 전체 순서대로** 실행해 두면,  
실제 운영 중 문제 발생 시에도 어느 단계에서 문제가 생겼는지 빠르게 진단할 수 있습니다.
