# KOREA 3D SKY ATLAS (한국 1,700대 명소 3D 스카이뷰 & 360° 로드뷰)

외국인 및 여행자를 위한 **대한민국 17개 시·도 × 100대 관광명소(총 1,700곳)** 3D 항공 스카이뷰 및 실시간 360° 로드뷰 웹 애플리케이션입니다.

## 주요 기능
- **실제 3D 항공 스카이뷰 & 지형 고도(`AWS Terrarium DEM`)**: 한반도 전체 산악 지형과 해안선을 3D 입체 스카이뷰로 탐색
- **17개 행정구역 × 100개 검증된 관광명소 (총 1,700곳)**: `data/spots-1700.js` 및 공식 행정구역 경계(`data/korea-geo-3d.js`) 내장
- **앱 내 일체형 360° 로드뷰 다이브**: 명소 클릭 시 3D 카메라가 지상 루프탑으로 강하하며, 백엔드 리졸버(`server.py`)가 가장 가까운 최신(2025~2026) 카카오 로드뷰 노드 및 명소 방향 각도(`bearing`)를 계산해 앱 내부 풀스크린으로 즉시 렌더링
- **13개 다국어 지원**: 한국어(`ko`), 영어(`en`), 일본어(`ja`), 중국어 간체/번체(`zh-CN`/`zh-TW`), 스페인어(`es`), 프랑스어(`fr`), 독일어(`de`), 베트남어(`vi`), 태국어(`th`), 인도네시아어(`id`), 러시아어(`ru`), 아랍어(`ar`)

---

## Mac (macOS) 및 Windows 실행 방법

별도의 외부 패키지 설치(`pip` / `npm`) 없이 Python 3 표준 라이브러리만으로 즉시 실행됩니다.

### 1. 클론 및 실행 (macOS / Linux)
```bash
git clone https://github.com/drrecord7/korea-3d-atlas.git
cd korea-3d-atlas
python3 server.py
```

### 2. 클론 및 실행 (Windows PowerShell)
```powershell
git clone https://github.com/drrecord7/korea-3d-atlas.git
cd korea-3d-atlas
python server.py
```

### 3. 브라우저 접속
- 주소: [http://127.0.0.1:8787](http://127.0.0.1:8787)

---

## 프로젝트 구조
- `index.html` — Spatial Glass HUD 메인 마크업
- `styles.css` — 다크 옵시디언 프로스티드 글래스 UI 및 반응형(모바일 바텀시트) 스타일
- `app.js` — MapLibre GL 3D 스카이뷰 엔진, 충돌 방지 공간 핀 렌더러, 360° 로드뷰 모달 컨트롤러
- `server.py` — 정적 파일 서버 및 WGS84 → WTM 좌표 변환 기반 실시간 최신 360° 로드뷰 노드 리졸버 (`/api/kakao-rv`)
- `data/spots-1700.js` — 전국 17개 시도별 100대 명소 데이터셋 (1,700곳)
- `data/korea-geo-3d.js` — 전국 17개 시도 행정구역 GeoJSON
- `data/i18n-guides.js` — 13개 언어 UI 및 지역별 여행 가이드 데이터
- `vendor/` — 로컬 번들링된 MapLibre GL JS (`v4.7.1`)
