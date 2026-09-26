# 얼굴 마스크 이미지 생성 프롬프트

각 게임 캐릭터에 맞는 얼굴 마스크 12종(`public/art/mask-<id>.png`)을
외부 도구로 만들 때 사용하세요. 게임 화면에서 플레이어 얼굴 위치에 겹쳐 표시됩니다.

## 공통 스펙 (12장 모두 동일)

- front-facing face mask centered on canvas, transparent background (PNG alpha),
  eye holes aligned horizontally at vertical center, calm flat vector style,
  thin slate outlines, leaf-green accents, cute and friendly,
  no text, no letters, no numbers, no watermark, square 1:1, 512x512 or larger
- 서로 다른 마스크라도 눈구멍 위치는 정중앙에 통일 (얼굴 추적 앵커와 일치)

## 배치 스펙 (코드 기준, 생성 시 참고)

- 앵커: 코(nose) 좌표, 코가 없으면 양어깨 중점 위 40px
- 크기: 어깨너비 × 1.4 (정사각 마스크가 얼굴을 덮음)
- 파일명: `mask-fruit.png`, `mask-squat.png`, `mask-math.png`, `mask-abc.png`,
  `mask-star.png`, `mask-balloon.png`, `mask-zombie.png`, `mask-dance.png`,
  `mask-simon.png`, `mask-yoga.png`, `mask-duo.png`, `mask-recycle.png`
- 파일이 없으면 자동으로 표시하지 않음 (플레이스홀더 없음)

## 1. mask-fruit.png — 닌자 복면

- green ninja mask with eye holes and a small knot tail on the side,
  white forehead band

## 2. mask-squat.png — 스포츠 헤어밴드

- wide leaf-green sports headband with a small lightning emblem,
  sweat drops flying (part of design, not text)

## 3. mask-math.png — 별 안경

- oversized round star-shaped glasses, yellow stars, thin slate frames

## 4. mask-abc.png — 알파벳 머리띠

- headband with a big soft letter T applique on the forehead

## 5. mask-star.png — 별 가면

- night-blue sleepover eye mask with one big yellow star over the forehead

## 6. mask-balloon.png — 풍선 고글

- round pink balloon goggles with highlight shine dots

## 7. mask-zombie.png — 장난감 좀비 가면

- cute Frankenstein-style mask with two bolts, stitched smile,
  funny not scary

## 8. mask-dance.png — 디스코 바이저

- shiny mirror-disco visor with music-note decorations on the sides

## 9. mask-simon.png — 로봇 바이저

- round light-blue robot visor with two big kind eyes printed on it

## 10. mask-yoga.png — 나뭇잎 화관

- eucalyptus leaf crown circlet with a small flower

## 11. mask-duo.png — 쌍별 안경

- glasses with two yellow stars, connected by a dotted line over the bridge

## 12. mask-recycle.png — 재활용 분리 마스크

- half-green half-blue mask split vertically, small leaf emblem on green side
