# 7주차 · 다음 여행지 한 줄 추천 게시판
친구에게 추천하고 싶은 여행지와 그곳에서 꼭 해볼 일을 공유하는 Flask 게시판입니다. 로그인 상태는 브라우저별 세션으로 구분하고, 계정·추천 글·신고 내용은 서버의 SQLite DB에 저장합니다.

## 구현한 기능

- 회원가입·로그인·로그아웃과 Werkzeug 비밀번호 해시
- 브라우저별 로그인 세션과 모든 POST 요청의 CSRF 검사
- 모든 방문자가 함께 보는 여행 추천 목록
- 로그인 사용자의 글 등록과 작성자 본인의 글 삭제
- 한 계정당 1분에 글 3개로 제한
- 다른 사용자의 글 신고, 본인 글 신고·중복 신고 차단
- 관리자 전용 글 검색·신고 필터·글 삭제·계정 차단/해제
- 연습 계정 2개와 여행 글 4개 생성, 연습 데이터만 정리
- SQLite 매개변수 `?` 사용과 Jinja 자동 이스케이프로 SQL 삽입·XSS 방어
- 데스크톱·모바일 반응형 화면

## 설치와 실행

저장소의 `week7` 폴더에서 실행합니다. 아래 명령은 이 프로젝트에서 사용한 macOS Miniconda 환경을 기준으로 합니다.

```sh
conda activate wp6
cd /Users/heogeonwoo/study/campus-hotspots/week7
~/miniconda3/envs/wp6/bin/python -m pip install -r requirements.txt
export SECRET_KEY="$(~/miniconda3/envs/wp6/bin/python -c 'import secrets; print(secrets.token_hex(32))')"
~/miniconda3/envs/wp6/bin/python -m flask --app app init-db
~/miniconda3/envs/wp6/bin/python -m flask --app app run --debug --port 5000
```

브라우저에서 <http://127.0.0.1:5000>을 엽니다. `init-db`를 다시 실행해도 기존 계정과 글은 삭제되지 않습니다. 새 터미널에서는 `SECRET_KEY`를 다시 설정해야 합니다.

## 관리자 계정 준비

1. 웹 화면에서 실습용 계정(예: `admin7`)을 먼저 만듭니다.
2. 실행 중인 서버를 `Ctrl+C`로 종료합니다.
3. 같은 `SECRET_KEY`가 설정된 터미널에서 아래 명령을 실행합니다.

```sh
export WEEK7_ADMIN_USERNAME='admin7'
~/miniconda3/envs/wp6/bin/python -m flask --app app promote-admin
~/miniconda3/envs/wp6/bin/python -m flask --app app run --debug --port 5000
```

다시 로그인하면 상단에 `관리 화면` 링크가 나타납니다. 관리자 권한은 회원가입 화면에서 고를 수 없고 로컬 터미널 명령으로만 지정합니다.

## 두 계정 확인 결과

- 계정 A와 B를 서로 다른 테스트 클라이언트로 로그인해 각자 다른 세션을 유지하는 것을 확인했습니다.
- A가 작성한 여행 추천이 B의 목록에도 표시되는 것을 확인했습니다.
- A에게는 자신의 글 삭제 버튼이 표시되고, B가 A의 삭제 주소로 요청하면 `403`이 반환되는 것을 확인했습니다.
- 서버가 아닌 별도 SQLite 연결로 다시 읽어도 계정과 글이 유지되는 것을 확인했습니다.
- 잘못된 비밀번호 로그인은 `401`, 중복 아이디 회원가입은 `400`이 반환되는 것을 확인했습니다.

## 보안·오류 확인 결과

- `<script>alert('xss')</script>`를 저장하면 태그가 실행되지 않고 글자로 표시되는 것을 확인했습니다.
- CSRF 토큰이 없는 POST 요청은 `400`이 반환되는 것을 확인했습니다.
- 같은 계정이 1분 안에 네 번째 글을 등록하면 `429`가 반환되는 것을 확인했습니다.
- 본인 글 신고와 같은 글의 중복 신고는 `400`으로 거절되는 것을 확인했습니다.
- SQL의 사용자 입력은 문자열 연결 대신 `?` 매개변수로 전달합니다.
- `SECRET_KEY`, 실제 비밀번호, `instance/app.db`는 저장소에 포함하지 않습니다.

## 관리자 기능 시험 결과

- 일반 계정으로 `/admin`에 직접 접근하면 `403`이 반환되는 것을 확인했습니다.
- 내용 검색과 `신고된 글만 보기`에서 신고 이유와 신고 수가 함께 표시되는 것을 확인했습니다.
- 관리자가 다른 사용자의 글을 삭제하고 계정을 차단·해제할 수 있음을 확인했습니다.
- 차단된 계정은 다시 로그인할 수 없고, 차단을 해제하면 다시 로그인할 수 있음을 확인했습니다.
- 연습 계정 2개와 글 4개가 생성되며, 정리 후에는 연습 데이터만 삭제되고 직접 만든 계정과 글은 유지되는 것을 확인했습니다.

## 실행 화면

- [데스크톱 추천 목록](screenshots/travel-board-desktop.png)
- [390px 모바일 추천 목록](screenshots/travel-board-mobile.png)

## 파일 구조

```text
week7/
├── app.py
├── schema.sql
├── mini_storage.py
├── requirements.txt
├── .gitignore
├── README.md
├── templates/
│   ├── base.html
│   ├── auth.html
│   ├── comments.html
│   ├── admin.html
│   └── error.html
├── static/
│   └── style.css
└── screenshots/
    ├── travel-board-desktop.png
    └── travel-board-mobile.png
```

`instance/`에는 로컬 DB가 생성되며 `.gitignore`로 제외됩니다. 이 실습은 로컬 서버 실행이 목표이므로 외부에 배포하지 않습니다.

