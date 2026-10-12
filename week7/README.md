# 7주차 · 다음 여행지 한 줄 추천 게시판
친구에게 추천하고 싶은 여행지와 그곳에서 꼭 해볼 일을 공유하는 Flask 게시판입니다. 로그인 상태는 브라우저별 세션으로 구분하고, 계정·추천 글·신고 내용은 서버의 SQLite DB에 저장합니다.


 Render 무료 배포에서는 서버가 재시작되면 DB 기록이 사라질 수 있습니다.

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

다시 로그인하면 상단에 `관리 화면` 링크가 나타납니다. 관리자 권한은 회원가입 화면에서 고를 수 없습니다. 로컬에서는 위 명령으로 지정하고, Render 무료 배포에서는 아래 환경변수로 관리자 계정을 준비합니다.

## Render 배포

6주차 이미지 앱과는 **별도의 Web Service**로 만듭니다. GitHub에 최신 코드를 push한 뒤 Render에서 다음과 같이 설정합니다.

| 설정 | 값 |
| --- | --- |
| Repository / Branch | 이 저장소 / 실제 사용하는 브랜치 |
| Root Directory | `week7` |
| Language | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `python -m flask --app app init-db && python -m flask --app app bootstrap-admin && gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 120` |
| Instance Type | `Free`  |

Render의 **Environment**에서 아래 값을 설정합니다. 값 자체는 GitHub와 README에 쓰지 않습니다.

- `SECRET_KEY`: 한 번 생성한 32자 이상의 무작위 문자열. 로컬에서 `python -c 'import secrets; print(secrets.token_hex(32))'`로 만들 수 있습니다. 재배포 때도 같은 값을 유지합니다.
- `PYTHON_VERSION`: `3.12.12` (수업의 Python 3.12 환경과 맞춤).
- `APP_HTTPS`: `1` (HTTPS에서만 세션 쿠키 전송).
- `WEEK7_ADMIN_USERNAME`: 관리자 아이디. 영문·숫자·밑줄 3~20자.
- `WEEK7_ADMIN_PASSWORD`: 관리자 비밀번호. 12~128자. 재시작으로 DB가 새로 만들어질 때 관리자 계정도 다시 생성됩니다.

배포가 Live 상태가 되면 Render가 부여한 주소의 `/comments`에서 회원가입·로그인·글 등록을 확인합니다. Render 무료 배포는 일정 시간 사용하지 않으면 종료될 수 있고, **SQLite 파일은 재시작·재배포·유휴 종료 시 사라집니다.** 그때 일반 계정·글·신고 기록도 초기화되고 로그인 세션은 유효하지 않게 됩니다. 시작 명령의 `init-db`와 `bootstrap-admin`이 빈 DB와 관리자 계정을 다시 준비하지만, 일반 계정과 글은 복원하지 않습니다. 따라서 이 배포는 기록 보존용이 아닌 수업 시연용입니다.

관리자 비밀번호를 변경할 때는 기존 DB에 저장된 비밀번호가 자동으로 바뀌지 않습니다. Render 무료 배포에서는 DB가 초기화된 다음 새 비밀번호가 적용됩니다.
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

`instance/`에는 SQLite DB가 생성되며 `.gitignore`로 제외됩니다. 로컬에서는 파일이 남지만, Render 무료 배포에서는 재시작 후 기록이 사라질 수 있습니다.

