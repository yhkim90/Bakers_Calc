# Bakers_Calc

제빵기능사 **공개문제 20종** 배합을 베이커스%로 환산하는 아이폰용 웹 앱입니다.

한 파일에 모든 코드를 넣지 않고, Lotto_Predict와 같이 역할별로 나눴습니다.

| 경로 | 역할 |
|---|---|
| `index.html` | 셸. CSS·JS만 불러옵니다 |
| `css/app.css` | 화면 스타일 |
| `js/calc.js` | 베이커스% 환산, 새로고침 |
| `js/store.js` | 이 기기 저장·내보내기·가져오기 |
| `js/catalog.js` | 공개문제 배합 정규화 |
| `js/app.js` | 화면 라우팅 |
| `data/exam-items.json` | 20종 기본 배합 |
| `icons/` | 홈 화면 아이콘 |
| `manifest.webmanifest` | 홈 화면 앱 등록 |
| `sw.js` | 오프라인 캐시 |

배합 숫자는 한국산업인력공단 공개문제의 베이커스%를 기준으로 넣었습니다. 과제 문구가 바뀌면 `data/exam-items.json`만 고치면 됩니다.

## GitHub에 올리기

올려야 할 것:

- `index.html`
- `css/`
- `js/`
- `data/exam-items.json`
- `icons/`
- `manifest.webmanifest`
- `sw.js`
- `.nojekyll`
- `README.md`

그다음 저장소 **Settings → Pages**에서 Source를 **Deploy from a branch**, branch는 `main`, folder는 `/ (root)`로 저장합니다.

주소 예: `https://<GitHub아이디>.github.io/Bakers_Calc/`

## 아이폰에서 쓰기

1. 위 Pages 주소를 **Safari**로 엽니다.
2. 공유 → **홈 화면에 추가**.

홈 화면 앱은 예전 파일을 붙잡는 경우가 있어, 왼쪽 위 **새로고침**으로 새 `index.html`을 다시 받습니다. 저장해 둔 배합은 지우지 않습니다.

공개문제 배합을 건드린 뒤에는 품목 화면 아래 **공개문제 20종 다시 넣기**로 기본 20종만 되돌릴 수 있습니다. 직접 만든 품목은 그대로 둡니다.
