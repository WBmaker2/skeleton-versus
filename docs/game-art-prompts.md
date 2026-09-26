# 게임 아트 이미지 생성 프롬프트

랜딩페이지 12장의 카드 이미지(`public/art/*.jpg`)를 외부 도구로 만들 때 사용하세요.
다 만들어지면 `public/art/`에 넣고 `npm run build`만 하면 카드에 자동 표시됩니다.
(파일이 없을 때는 미소 얼굴 플레이스홀더가 대신 보입니다.)

## 공통 스타일 (12장 모두 동일하게 적용)

- soft flat vector illustration for elementary school kids, thin slate outlines,
  warm paper background, calm leaf-green accents, gentle and friendly,
  simple shapes, no text, no letters, no numbers, no watermark,
  4:3 landscape, 1024x768 or larger
- 피할 것: neon colors, dark backgrounds, scary faces, photorealism

## 1. public/art/fruit-ninja.jpg

- a smiling kid in a green headband slicing a big happy watermelon in mid-air,
  a few fruit slices floating, warm paper background

## 2. public/art/squat-runner.jpg

- a cheerful kid runner with a green cap running on a park track,
  soft motion lines, morning sky background

## 3. public/art/math-jump.jpg

- a happy student jumping toward three round balloons with simple dot patterns,
  confetti, warm paper background

## 4. public/art/body-abc.jpg

- a smiling kid with arms wide open in a T shape, soft alphabet blocks nearby,
  warm paper background

## 5. public/art/star-catch.jpg

- a kid reaching up toward one big sparkling star in a soft evening sky,
  calm navy-tinted background with the star glowing warm yellow

## 6. public/art/balloon-head.jpg

- a kid heading a round green balloon up into the air, joyful expression,
  warm paper background

## 7. public/art/zombie-steps.jpg

- a cute toy-like zombie far behind, a kid stepping sideways with a smile,
  playground background, funny not scary

## 8. public/art/rhythm-dance.jpg

- a kid dancing with music notes floating around, one arm up,
  warm stage-light background

## 9. public/art/simon-says.jpg

- a friendly round robot teacher holding up one hand, big kind eyes,
  classroom background

## 10. public/art/yoga-mirror.jpg

- a kid standing in a tree pose, arms up, calm and balanced,
  soft garden background

## 11. public/art/duo-stars.jpg

- a kid holding two glowing stars, one in each hand, arms wide,
  connecting dotted line between the stars

## 12. public/art/recycle-sort.jpg

- a kid placing a bottle into the left bin and a can into the right bin,
  two tidy recycling bins, park background

## 배치 확인

- 파일명 오타 주의 ( 코드가 참조하는 경로: `art/fruit-ninja.jpg`,
  `art/squat-runner.jpg`, `art/math-jump.jpg`, `art/body-abc.jpg`,
  `art/star-catch.jpg`, `art/balloon-head.jpg`, `art/zombie-steps.jpg`,
  `art/rhythm-dance.jpg`, `art/simon-says.jpg`, `art/yoga-mirror.jpg`,
  `art/duo-stars.jpg`, `art/recycle-sort.jpg` )
- PNG 권장, 1024px 이상. 넣은 뒤 `npm run dev`로 카드에 뜨는지 확인
- 대체 텍스트는 `src/ui/landing.ts`의 `artAlt`에 이미 작성되어 있음
