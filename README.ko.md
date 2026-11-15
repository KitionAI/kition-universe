<div align="center">

# Kition Universe

Kition의 3D 별 지도입니다. Kition은 AI를 위한 오픈 프로 소프트웨어 모음이며, kit 하나가 행성 하나입니다. 날아다니고, 착륙하고, AI 에이전트가 실제 파일로 일하는 모습을 볼 수 있습니다.

**[Kition Universe 열기 → universe.kition.ai](https://universe.kition.ai)**

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · **한국어** · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português](README.pt-BR.md) · [Tiếng Việt](README.vi.md)

</div>

[![Kition Universe](docs/images/kits.webp)](https://universe.kition.ai)

## 무엇인가요

Kition은 kit이라고 부르는 16개의 전문 편집기입니다. 문서, 스프레드시트, 슬라이드, PDF, 이미지, 영상, 벡터, CAD, 3D 장면 등을 다룹니다. 모든 kit은 실제 파일을 열고, Kit Harness Protocol(KHP)이라는 하나의 열린 프로토콜을 통해 AI 에이전트가 조작할 수 있습니다.

Kition Universe는 이 모든 것을 한눈에 보는 곳입니다. 각 kit으로 무엇을 만들 수 있는지, AI는 그것을 어떻게 쓰는지, 여러분은 어떻게 쓸 수 있는지, 이 세 가지 질문에 답합니다.

## 여기서 할 수 있는 일

### kit마다 하나씩, 16개의 행성 방문하기

kit마다 고유한 세계가 있습니다. 바다 행성, 가스 행성, 도시 격자, 용암 행성. 행성을 클릭하면 kit으로 만들 수 있는 것을 보여 주고, 착륙하면 도시를 둘러볼 수 있습니다. 도시의 건물 하나하나가 kit의 기능입니다.

### 에이전트가 일하는 모습 보기

재생을 누르면 에이전트가 보내는 명령이 하나씩 나타나고, 옆에는 각 단계 뒤에 kit이 그린 그림이 표시됩니다. 사용 중인 건물에 불이 켜집니다. 끝나면 프롬프트와 설정을 여러분의 AI용으로 복사할 수 있습니다. 이것은 실제 kit 명령의 기록이며, 실시간 모델이 아닙니다.

![에이전트가 일하는 모습 보기](docs/images/replay.webp)

### 하나의 작업을 여러 kit에 걸쳐 따라가기

12개의 시나리오 은하가 kit이 어떻게 조합되는지 보여 줍니다. 경영 보고는 스프레드시트에서 보고서, 슬라이드, 서명된 PDF로 이어집니다. 수송선이 파일을 행성에서 행성으로 나르고, 완성된 파일은 결과 덱에 놓입니다.

![하나의 작업을 여러 kit에 걸쳐 따라가기](docs/images/scenario.webp)

### 하고 싶은 일에서 시작하기

"분기 보고", "피벗", ".psd"를 입력하면 바로 그곳으로 날아갑니다. 시나리오, kit, 기능, 에이전트 명령, 파일 형식을 검색할 수 있습니다. 검색은 브라우저 안에서 이루어지며 아무것도 전송되지 않습니다.

![하고 싶은 일에서 시작하기](docs/images/search.webp)

### 다른 사람이 만든 것 보기

kit 위에 만든 제품은 제품 은하의 행성이 되고, 사용하는 kit과 빛의 선으로 이어집니다. 등록은 무료이며 모든 제품 행성의 크기는 같습니다.

![다른 사람이 만든 것 보기](docs/images/products.webp)

### 전체가 어떻게 이어지는지 보기

전체 보기에서 시나리오 은하를 가리키면 그것을 이루는 kit 행성으로 선이 그려집니다. 60초 투어가 프로토콜, kit 하나, 시나리오 하나, 제품을 차례로 안내합니다.

![전체가 어떻게 이어지는지 보기](docs/images/overview.webp)

## 16개의 kit

kit 하나가 행성 하나입니다. Preview로 표시된 kit은 아직 만드는 중이며, 행성에 비계가 설치되어 있습니다.

| Kit | 편집 대상 | 파일 | 행성 |
| --- | --- | --- | --- |
| [**motion**](https://universe.kition.ai/planet/motion/) | 모션 그래픽 | `.kmotion` | 용암 행성 |
| [**note**](https://universe.kition.ai/planet/note/) | 서로 연결되는 Markdown 노트 | `.md` | 가스 행성 |
| [**table**](https://universe.kition.ai/planet/table/) | 필드 유형과 보기를 갖춘 구조화된 테이블 | `.ktable` | 도시 행성 |
| [**board**](https://universe.kition.ai/planet/board/) | 화이트보드와 마인드맵 | `.kboard` | 바다 행성 |
| [**photo**](https://universe.kition.ai/planet/photo/) | 레이어 이미지 | `.psd` | 폭풍 행성 |
| [**film**](https://universe.kition.ai/planet/film/) | 영상 편집 | `.kfilm` | 가스 행성 |
| [**doc**](https://universe.kition.ai/planet/doc/) | 워드프로세서 문서 | `.docx` | 바다 행성 |
| [**sheet**](https://universe.kition.ai/planet/sheet/) | 스프레드시트 | `.xlsx` | 도시 행성 |
| [**slide**](https://universe.kition.ai/planet/slide/) | 프레젠테이션 | `.kslide` | 가스 행성 |
| [**pdf**](https://universe.kition.ai/planet/pdf/) | PDF 페이지, 양식, 가림 처리 | `.pdf` | 분화구 암석 행성 |
| [**vector**](https://universe.kition.ai/planet/vector/) | 벡터 일러스트 | `.kvector` | 결정 행성 |
| [**layout**](https://universe.kition.ai/planet/layout/) · Preview | 페이지 레이아웃 | `.klayout` | 사구 행성 |
| [**cad**](https://universe.kition.ai/planet/cad/) · Preview | 2D 도면 | `.dxf` | 분화구 암석 행성 |
| [**html**](https://universe.kition.ai/planet/html/) · Preview | 웹 페이지 | `.html` | 폭풍 행성 |
| [**scene**](https://universe.kition.ai/planet/scene/) · Preview | 3D 장면 | `.kscene` | 바다 행성 |
| [**design**](https://universe.kition.ai/planet/design/) · Preview | 인터페이스 디자인 | `.kdesign` | 결정 행성 |

## 알아 둘 점

- 이 사이트는 AI 모델을 호출하지 않습니다. 리플레이는 실제 kit 명령의 기록이고, 그림은 kit이 그린 것입니다.
- 진행 상황(방문한 행성, 본 리플레이)은 브라우저에만 저장됩니다. 계정은 없습니다.
- WebGL 없이도 작동합니다. 정적인 지도와 같은 내용이 표시되고 리플레이도 볼 수 있습니다.
- 영어와 중국어로 제공됩니다.

## 제품이나 은하 추가하기

kit으로 무언가를 만드셨나요? 제품 은하의 행성으로 등록할 수 있습니다. 여러 kit을 거치는 작업 방식이 있다면 시나리오 은하를 제안할 수 있습니다. 둘 다 무료이며 issue 양식으로 접수합니다.

- [제품 행성 추가하기](https://github.com/KitionAI/kition-universe/issues/new?template=built-with-kition.yml)
- [시나리오 은하 제안하기](https://github.com/KitionAI/kition-universe/issues/new?template=scenario-galaxy.yml)
- [규칙과 형식](CONTRIBUTING.md)

## 개발자를 위해

사이트는 정적입니다. Astro, three.js, 데이터 파일 하나로 이루어져 있습니다. 로컬에서 실행하려면:

```bash
pnpm install
pnpm dev        # http://localhost:4330
```

빌드, 검사, 배포 방법: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## 링크

- [Kition](https://kition.ai) · [GitHub](https://github.com/KitionAI/kition)
- [Kition SDK](https://github.com/KitionAI/kition-sdk)
- [Kit Harness Protocol](https://universe.kition.ai/protocol/)

## 라이선스

Apache-2.0
