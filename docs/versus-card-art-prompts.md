# 대전 카드 이미지 생성 프롬프트 (17종)

랜딩페이지 17장 카드 이미지(`public/art/versus-*.jpg`)를 구글 플로우(Nano Banana 2)로
만들 때 사용한 프롬프트 기록. 다시 만들거나 추가할 때 같은 스타일로 맞춘다.
생성일: 2026-09-27 / 도구: 구글 플로우 / 크기: 1200×896 (4:3).

## 공통 스타일 (17장 모두 앞에 붙임)

- soft flat vector illustration for elementary school kids, thin slate outlines,
  warm paper background, calm leaf-green accents, gentle and friendly,
  simple shapes, no text, no letters, no numbers, no watermark, 4:3 landscape
- 고정 마스코트 2인조 (매 프롬프트 포함):
  A cheerful boy with a green cap and a smiling girl with short bob hair,
  always appearing together side by side
  (ABC 7번만 예외: 각자 다른 글자 포즈)
- 피할 것: neon colors, dark backgrounds, scary faces, photorealism,
  한 명만 등장, 글자·숫자入り

## 종목별 뒷부분

1. `versus-fruit.jpg` — slicing big happy fruits (watermelon, orange) in mid-air
   with their hands, fruit slices floating, motion lines
2. `versus-tug.jpg` — doing squats facing each other, pulling an imaginary rope
   together, park background
3. `versus-math.jpg` — jumping toward three big round stepping stones,
   confetti, excited expressions
4. `versus-star.jpg` — reaching up toward one big sparkling star, soft evening
   sky, star glowing warm yellow
5. `versus-simon.jpg` — copying the pose of a friendly round robot teacher
   raising one hand, classroom background
6. `versus-duo.jpg` — connecting glowing stars with a dotted line, finished
   part solid yellow, night sky
7. `versus-abc.jpg` — the boy making a T shape with wide open arms, the girl
   making a Y shape, soft alphabet blocks nearby
8. `versus-dance.jpg` — dancing with music notes floating around, one arm up
   each, warm stage-light background
9. `versus-balloon.jpg` — heading round balloons up into the air, joyful
   expressions
10. `versus-zombie.jpg` — stepping sideways together with smiles, a cute
    toy-like zombie far behind, playground background, funny not scary
11. `versus-punch.jpg` — punching forward at round target circles, speed lines,
    energetic poses
12. `versus-clap.jpg` — clapping hands together facing each other, small
    sparkles at their hands
13. `versus-balance.jpg` — each standing on one leg like flamingos, arms out
    for balance, calm pond background
14. `versus-memory.jpg` — looking at three big cards showing hand poses,
    thinking with fingers on chins
15. `versus-run.jpg` — running in place with high knees on a park track, soft
    motion lines, morning sky
16. `versus-power.jpg` — pulling an imaginary rope toward themselves with bent
    arms, determined smiling faces
17. `versus-laser.jpg` — ducking under a glowing red horizontal laser beam, one
    crouching one bending, playful tension

## Flow 사용 메모

- 한 번에 1장씩, 공통 스타일 + 종목 1줄을 합쳐 입력 (가로형 4:3, x1).
- 1명만 나오면 마스코트 문장을 강조해 재생성.
- 글자·숫자가 들어가면 `no text`를 강조해 재생성 (카드 제목은 HTML 텍스트로 표시).
- 다운로드는 생성된 이미지 URL을 브라우저에서 받아 `public/art/`에 저장.
  파일명 규칙: `versus-<대전 id 뒷부분>.jpg` (예: `versus-fruit.jpg`).
