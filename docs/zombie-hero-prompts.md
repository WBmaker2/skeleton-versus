# 좀비 스텝 하단 캐릭터 이미지 생성 프롬프트 (선택)

현재 게임은 외부 이미지 없이 `src/games/zombie/zombie-steps.ts`의 `drawHero()`가
캔버스에 직접 귀여운 러너를 그립니다. 그대로 두면 에셋 없이 동작합니다.

더 고품질 스프라이트를 원할 때만 아래 프롬프트로 외부 도구에서 만들고,
`public/art/zombie-hero.png`에 넣은 뒤 `drawHero()` 대신 `drawImage`로 교체하세요.

## 공통 스타일

- soft flat vector illustration for elementary school kids, thin slate outlines (#22303c),
  front-facing, full-body, symmetric pose (셀카 미러에서 방향 혼동 방지),
  leaf-green hoodie (#22c55e) + green cap + yellow brim (#dfff00),
  warm skin tone, smiling, rosy cheeks, cute and friendly,
  transparent background (PNG alpha), no text, no letters, no numbers,
  no watermark, no shadow baked in (그림자는 코드에서 그림), square 1:1, 512x512 or larger
- 피할 것: scary, photorealism, neon colors, side-profile only, weapons

## 1. public/art/zombie-hero.png (기본, 정면)

- a cute kid runner standing front-facing, feet together, arms slightly out,
  green hoodie with light mint pocket, white shoes, green cap with yellow brim,
  big kind eyes, small smile, feet at bottom-center of canvas with 8% margin

## 2. 좌우 스텝 변형 (선택, 2장)

- `zombie-hero-left.png`: same kid, left leg stepped out to the side, arms swinging left
- `zombie-hero-right.png`: same kid, right leg stepped out to the side, arms swinging right
- 나머지 디자인·색상은 기본과 동일하게 유지 (연속 프레임처럼 보이게)

## 배치·코드 교체 스펙

- 파일명: `zombie-hero.png` (변형까지 쓰면 `-left`, `-right` 추가)
- 앵커: 발바닥 = 이미지 하단 중앙 → 코드에서 `drawImage(img, heroX - s, groundY - 2*s, 2*s, 2*s)` 형태로 발이 `groundY`에 닿게
- 크기: `s = clamp(width / 18, 30, 46) * 2.6` 정도가 현재 `drawHero()`와 비슷한 체감 크기
- 파일이 없으면 현재 코드 그대로 둔다 (폴백: 직접 드로잉)
- 넣은 뒤 `npm run dev` → `#/zombie`에서 캐릭터가 몸을 따라 좌우로 움직이는지 확인
- 현재 땅선: `judgeY = height - 20`, 노랑 `#dfff00` 6px + 어두운 밑선 (코드 기준)
