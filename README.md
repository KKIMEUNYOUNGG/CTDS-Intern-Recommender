# PICK ME 사이트

나와 스펙이 비슷한 합격자가 있는 공고부터 추천하는 서비스의 웹 화면입니다.
직무와 스펙을 한 번 입력하면 모집 중인 공고 5건이 카드로 나오고, 카드의 **합격자 정보 보기** 버튼을 누르면 같은 스펙으로 합격자 스펙·자소서·전문가 총평·첨삭을 볼 수 있습니다.

```
브라우저(index.html) ─POST→ /api/recommend ─→ Dify 추천 앱 ─→ 공고 카드 5건(JSON)
                    └POST→ /api/passers   ─→ Dify 합격자 앱 ─→ 합격자 정보(JSON) ─→ passers.js가 화면으로 그림
```

API 키는 서버 함수(`api/`)에만 있고 브라우저로 내려가지 않습니다.

## 폴더 구성
| 파일 | 역할 | 담당 |
|---|---|---|
| `index.html` | 입력 폼, 추천 카드, 설명 섹션 | 은영 |
| `api/recommend.js` | 추천 앱 호출 (입력 검증, 결과 JSON 반환) | 은영 |
| `api/passers.js` | 합격자 앱 호출 (공고번호는 숫자만 허용) | 은영 |
| `api/_dify.js` | 두 함수가 같이 쓰는 Dify 호출 코드 | 은영 |
| `passers.js` | 합격자 정보 패널: JSON을 화면으로 그림 | 서현 |
| `passers.css` | 합격자 정보 패널 스타일 (`.ps-*`) | 서현 |
| `assets/pipeline.png` | 설명 섹션의 파이프라인 그림 | 공용 |
| `sample/*.json` | 화면 확인용 예시 데이터 | 공용 |
| `vercel.json` | 서버 함수 실행 시간(60초) 설정 | 공용 |

저장소 맨 위에 위 파일과 폴더가 모두 있어야 합니다. `api/`가 없으면 추천 버튼이 동작하지 않고, `assets/`가 없으면 그림이 깨져 보입니다.

## 배포 (Vercel)
1. 이 폴더의 내용을 GitHub 저장소 맨 위에 올립니다. 폴더째가 아니라 안의 파일을 올립니다.
2. Vercel 프로젝트의 Settings → Environment Variables에 아래 값을 넣습니다.

| 이름 | 값 |
|---|---|
| `DIFY_KEY_RECOMMEND` | "PICK ME 추천 (사이트 API용)" 앱의 API 키 |
| `DIFY_KEY_PASSERS` | 합격자 상세 앱의 API 키 |
| `DIFY_API_BASE` | (선택) 기본값 `https://api.dify.ai/v1` |

3. 환경변수를 넣거나 바꾼 뒤에는 Redeploy 해야 반영됩니다.

## 화면만 미리 보기 (Dify 없이)
```
python3 -m http.server 8000
```
브라우저에서 `http://localhost:8000/index.html?mock=1`을 엽니다. `sample/`의 예시 데이터로 입력부터 합격자 정보까지 확인할 수 있습니다.
`sample/passers.json`의 `similar_points`는 화면 확인용으로 채운 예시입니다.

## API 형식
- `POST /api/recommend`
  - 요청: `desired_role`(필수), `employment_type`, `location`, `data_mode`, `university`, `major`, `gpa`, `gpa_scale`, `language_type`, `language_score`, `cert_count`, `award_count`, `activity_count` 등
  - 응답: `{ mode, checked_at, warnings, jobs: [ { index, job_id, title, company_name, d_day, passer_note, ... } ] }`. 후보가 없으면 `{ jobs: [], message }`
- `POST /api/passers`
  - 요청: `recruitment_id`(공고번호) + 위와 같은 스펙 항목
  - 응답: `{ data, markdown }`. `data`는 합격자 목록과 자소서 JSON, `markdown`은 합격자 자료가 없을 때의 안내 문구

## 합격자 패널 수정 (서현)
`passers.js`의 `window.renderPassers(root, payload)`가 `/api/passers` 응답을 받아 그립니다. 데이터 형식은 파일 맨 위 주석에 있고, 스타일은 `passers.css`의 `.ps-*`만 고치면 됩니다. 다른 파일을 건드리지 않아도 돼서 합칠 때 겹치지 않습니다.

## 알려진 한계
- 공고 상세요강이 이미지라 모집분야와 담당업무를 수집하지 못합니다. 화면에는 "미확인"으로 표시됩니다.
- 추천은 20~40초쯤 걸릴 수 있습니다. 서버 함수는 60초 안에 끝나야 합니다.
- 합격자 자료에는 가상 데이터가 포함되며, 화면에서 실제와 구분해 표시합니다.
