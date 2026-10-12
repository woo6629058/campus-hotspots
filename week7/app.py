"""7주차 과제: 로그인과 SQLite를 사용하는 여행지 한 줄 추천 게시판."""

import os
import re
import secrets
import sqlite3
from pathlib import Path

from flask import Flask, abort, g, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash


secret_key = os.environ.get("SECRET_KEY", "")
if len(secret_key) < 32:
    raise RuntimeError(
        "SECRET_KEY 환경변수에 32자 이상의 무작위 값을 설정하세요. week7/README.md를 확인하세요."
    )

app = Flask(__name__)
app.config.update(
    SECRET_KEY=secret_key,
    DATABASE=os.environ.get(
        "WEEK7_DB_PATH", str(Path(app.instance_path) / "app.db")
    ),
    MAX_CONTENT_LENGTH=16 * 1024,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("APP_HTTPS") == "1",
)

BOARD_TITLE = "다음 여행지 한 줄 추천"
BOARD_QUESTION = "친구에게 추천하고 싶은 여행지와 그곳에서 꼭 해볼 일을 한 줄로 남겨 주세요."
USERNAME_RULE = re.compile(r"[A-Za-z0-9_]{3,20}\Z")


def get_db():
    """한 요청 안에서는 연결을 재사용하고 외래 키 검사를 켭니다."""
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"], timeout=5)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(error):
    db = g.pop("db", None)
    if db is not None:
        db.close()


@app.cli.command("init-db")
def init_db_command():
    """없는 표만 만들어 기존 계정과 글을 유지합니다."""
    Path(app.config["DATABASE"]).parent.mkdir(parents=True, exist_ok=True)
    with app.open_resource("schema.sql") as schema:
        get_db().executescript(schema.read().decode("utf-8"))

    columns = {row["name"] for row in get_db().execute("PRAGMA table_info(users)")}
    for column in ("is_admin", "is_blocked", "is_test"):
        if column not in columns:
            get_db().execute(
                f"ALTER TABLE users ADD COLUMN {column} INTEGER NOT NULL DEFAULT 0"
            )
    get_db().execute(
        "INSERT OR IGNORE INTO app_meta (key, value) VALUES ('generation', ?)",
        (secrets.token_urlsafe(32),),
    )
    get_db().commit()
    print(f"DB 준비 완료: {app.config['DATABASE']}")


@app.cli.command("promote-admin")
def promote_admin_command():
    """회원가입을 마친 계정 하나를 로컬 터미널에서 관리자로 지정합니다."""
    username = os.environ.get("WEEK7_ADMIN_USERNAME", "").strip()
    if not username:
        raise RuntimeError("WEEK7_ADMIN_USERNAME에 가입한 아이디를 설정하세요.")

    db = get_db()
    result = db.execute(
        "UPDATE users SET is_admin = 1 WHERE username = ?", (username,)
    )
    db.commit()
    if result.rowcount != 1:
        raise RuntimeError("가입한 아이디를 찾을 수 없습니다.")
    print(f"관리자 지정 완료: {username}")


@app.cli.command("bootstrap-admin")
def bootstrap_admin_command():
    """Render 재시작으로 DB가 초기화되어도 관리자 계정을 다시 준비합니다."""
    username = os.environ.get("WEEK7_ADMIN_USERNAME", "").strip()
    password = os.environ.get("WEEK7_ADMIN_PASSWORD", "")
    if not username and not password:
        print("관리자 자동 생성 건너뜀: 환경변수가 설정되지 않았습니다.")
        return
    if not USERNAME_RULE.fullmatch(username) or not 12 <= len(password) <= 128:
        raise RuntimeError(
            "WEEK7_ADMIN_USERNAME은 영문·숫자·밑줄 3~20자, "
            "WEEK7_ADMIN_PASSWORD는 12~128자로 설정하세요."
        )

    db = get_db()
    existing = db.execute(
        "SELECT id, is_admin FROM users WHERE username = ?", (username,)
    ).fetchone()
    if existing is None:
        db.execute(
            "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)",
            (username, generate_password_hash(password)),
        )
        print(f"관리자 계정 생성 완료: {username}")
    else:
        if not existing["is_admin"]:
            raise RuntimeError(
                "이미 일반 계정으로 사용 중인 아이디입니다. 다른 관리자 아이디를 설정하세요."
            )
        db.execute(
            "UPDATE users SET password_hash = ?, is_blocked = 0 WHERE id = ?",
            (generate_password_hash(password), existing["id"]),
        )
        print(f"기존 관리자 비밀번호 갱신 완료: {username}")
    db.commit()


@app.before_request
def load_user_and_check_csrf():
    """세션의 사용자를 읽고 모든 POST 요청의 CSRF 값을 확인합니다."""
    g.user = None
    user_id = session.get("user_id")
    if isinstance(user_id, int):
        generation = get_db().execute(
            "SELECT value FROM app_meta WHERE key = 'generation'"
        ).fetchone()
        if generation is None or session.get("db_generation") != generation["value"]:
            session.clear()
        else:
            g.user = get_db().execute(
                "SELECT id, username, is_admin, is_blocked FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
            if g.user is None or g.user["is_blocked"]:
                g.user = None
                session.clear()
    elif user_id is not None:
        session.clear()

    if request.method == "POST":
        expected = session.get("_csrf_token")
        received = request.form.get("_csrf_token")
        if not expected or not received or not secrets.compare_digest(expected, received):
            abort(
                400,
                description="요청 확인 값이 없거나 맞지 않습니다. 페이지를 다시 열어 주세요.",
            )


@app.context_processor
def template_values():
    token = session.get("_csrf_token")
    if token is None:
        token = secrets.token_urlsafe(32)
        session["_csrf_token"] = token
    return {
        "csrf_token": token,
        "current_user": g.get("user"),
        "board_title": BOARD_TITLE,
        "board_question": BOARD_QUESTION,
    }


@app.get("/")
@app.get("/comments")
def comments():
    rows = get_db().execute(
        """SELECT comments.id, comments.content, comments.created_at,
                  users.id AS author_id, users.username
           FROM comments JOIN users ON comments.user_id = users.id
           ORDER BY comments.created_at DESC, comments.id DESC"""
    ).fetchall()

    reported_ids = set()
    if g.user is not None:
        reported_ids = {
            row["comment_id"]
            for row in get_db().execute(
                "SELECT comment_id FROM reports WHERE reporter_id = ?",
                (g.user["id"],),
            )
        }
    return render_template(
        "comments.html", comments=rows, reported_ids=reported_ids
    )


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        return render_template("auth.html", mode="register")

    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")
    if not USERNAME_RULE.fullmatch(username):
        return (
            render_template(
                "auth.html",
                mode="register",
                error="아이디는 영문·숫자·밑줄 3~20자로 작성해 주세요.",
                username=username,
            ),
            400,
        )
    if len(password) < 8 or len(password) > 128:
        return (
            render_template(
                "auth.html",
                mode="register",
                error="비밀번호는 8~128자로 작성해 주세요.",
                username=username,
            ),
            400,
        )

    try:
        db = get_db()
        db.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, generate_password_hash(password)),
        )
        db.commit()
    except sqlite3.IntegrityError:
        return (
            render_template(
                "auth.html",
                mode="register",
                error="이미 사용 중인 아이디입니다.",
                username=username,
            ),
            400,
        )
    return redirect(url_for("login", registered=1))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template("auth.html", mode="login")

    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")
    user = get_db().execute(
        "SELECT id, password_hash, is_blocked FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    if user is None or not check_password_hash(user["password_hash"], password):
        return (
            render_template(
                "auth.html",
                mode="login",
                error="아이디 또는 비밀번호를 확인해 주세요.",
                username=username,
            ),
            401,
        )
    if user["is_blocked"]:
        return (
            render_template(
                "auth.html",
                mode="login",
                error="차단된 계정입니다. 관리자에게 문의해 주세요.",
                username=username,
            ),
            403,
        )

    session.clear()
    session["user_id"] = user["id"]
    session["db_generation"] = get_db().execute(
        "SELECT value FROM app_meta WHERE key = 'generation'"
    ).fetchone()["value"]
    session["_csrf_token"] = secrets.token_urlsafe(32)
    return redirect(url_for("comments"))


@app.post("/logout")
def logout():
    session.clear()
    return redirect(url_for("comments"))


@app.post("/comments")
def add_comment():
    if g.user is None:
        abort(401, description="추천을 남기려면 로그인해 주세요.")

    content = request.form.get("content", "").strip()
    if not 1 <= len(content) <= 300:
        abort(400, description="추천 글은 1~300자로 작성해 주세요.")

    db = get_db()
    recent = db.execute(
        """SELECT COUNT(*) FROM comments
           WHERE user_id = ? AND created_at >= datetime('now', '-1 minute')""",
        (g.user["id"],),
    ).fetchone()[0]
    if recent >= 3:
        abort(429, description="1분에 추천 글은 3개까지만 등록할 수 있습니다.")

    db.execute(
        "INSERT INTO comments (user_id, content) VALUES (?, ?)",
        (g.user["id"], content),
    )
    db.commit()
    return redirect(url_for("comments", posted=1))


@app.post("/comments/<int:comment_id>/delete")
def delete_comment(comment_id):
    if g.user is None:
        abort(401, description="추천 글을 삭제하려면 로그인해 주세요.")

    db = get_db()
    comment = db.execute(
        "SELECT user_id FROM comments WHERE id = ?", (comment_id,)
    ).fetchone()
    if comment is None:
        abort(404, description="추천 글을 찾을 수 없습니다.")
    if comment["user_id"] != g.user["id"]:
        abort(403, description="자신이 작성한 추천 글만 삭제할 수 있습니다.")

    db.execute(
        "DELETE FROM comments WHERE id = ? AND user_id = ?",
        (comment_id, g.user["id"]),
    )
    db.commit()
    return redirect(url_for("comments", deleted=1))


@app.post("/comments/<int:comment_id>/report")
def report_comment(comment_id):
    if g.user is None:
        abort(401, description="신고하려면 로그인해 주세요.")

    reason = request.form.get("reason", "").strip()
    if not 3 <= len(reason) <= 100:
        abort(400, description="신고 이유는 3~100자로 작성해 주세요.")

    db = get_db()
    comment = db.execute(
        "SELECT user_id FROM comments WHERE id = ?", (comment_id,)
    ).fetchone()
    if comment is None:
        abort(404, description="추천 글을 찾을 수 없습니다.")
    if comment["user_id"] == g.user["id"]:
        abort(400, description="자신이 작성한 글은 신고할 수 없습니다.")

    try:
        db.execute(
            "INSERT INTO reports (comment_id, reporter_id, reason) VALUES (?, ?, ?)",
            (comment_id, g.user["id"], reason),
        )
        db.commit()
    except sqlite3.IntegrityError:
        abort(400, description="이미 신고한 글입니다.")
    return redirect(url_for("comments", reported=1))


def require_admin():
    if g.user is None or not g.user["is_admin"]:
        abort(403, description="관리자만 열 수 있는 화면입니다.")


@app.get("/admin")
def admin():
    require_admin()
    query = request.args.get("q", "").strip()[:100]
    reported_only = request.args.get("reported") == "1"
    db = get_db()
    rows = db.execute(
        """SELECT comments.id, comments.content, comments.created_at,
                  users.username, COUNT(reports.id) AS report_count,
                  GROUP_CONCAT(reports.reason, ' / ') AS report_reasons
           FROM comments JOIN users ON users.id = comments.user_id
           LEFT JOIN reports ON reports.comment_id = comments.id
           WHERE instr(lower(comments.content), lower(?)) > 0
           GROUP BY comments.id
           HAVING (? = 0 OR COUNT(reports.id) > 0)
           ORDER BY comments.id DESC""",
        (query, int(reported_only)),
    ).fetchall()
    users = db.execute(
        """SELECT id, username, is_admin, is_blocked, is_test
           FROM users ORDER BY id"""
    ).fetchall()
    test_user_count = sum(user["is_test"] for user in users)
    test_comment_count = db.execute(
        """SELECT COUNT(*) FROM comments
           JOIN users ON comments.user_id = users.id WHERE users.is_test = 1"""
    ).fetchone()[0]
    return render_template(
        "admin.html",
        comments=rows,
        users=users,
        query=query,
        reported_only=reported_only,
        test_user_count=test_user_count,
        test_comment_count=test_comment_count,
        test_credentials=session.pop("test_credentials", None),
        test_notice=session.pop("test_notice", None),
    )


@app.post("/admin/test-data/create")
def create_test_data():
    require_admin()
    db = get_db()
    password = secrets.token_urlsafe(12)
    password_hash = generate_password_hash(password)
    samples = (
        "[연습] 부산 흰여울문화마을에서 바다를 보며 골목을 걸어 보세요.",
        "[연습] 제주에서는 이른 아침 오름에 올라 천천히 일출을 보고 싶어요.",
        "[연습] 교토 아라시야마 대나무숲은 사람이 적은 오전에 추천해요.",
        "[연습] 강릉 안목해변에서 커피를 들고 해 질 무렵 산책해 보세요.",
        "[연습] 전주 한옥마을 골목에서 좋아하는 간식을 하나씩 골라 보세요.",
        "[연습] 이 글을 다른 연습 계정으로 신고해 보세요.",
    )
    names = []
    for label in ("a", "b"):
        username = f"travel_{label}_{secrets.token_hex(4)}"
        cursor = db.execute(
            "INSERT INTO users (username, password_hash, is_test) VALUES (?, ?, 1)",
            (username, password_hash),
        )
        names.append(username)
        for content in secrets.SystemRandom().sample(samples, 2):
            db.execute(
                "INSERT INTO comments (user_id, content) VALUES (?, ?)",
                (cursor.lastrowid, content),
            )
    db.commit()
    session["test_credentials"] = {"names": names, "password": password}
    return redirect(url_for("admin"))


@app.post("/admin/test-data/delete")
def delete_test_data():
    require_admin()
    db = get_db()
    count = db.execute(
        "SELECT COUNT(*) FROM users WHERE is_test = 1"
    ).fetchone()[0]
    db.execute(
        "DELETE FROM reports WHERE reporter_id IN (SELECT id FROM users WHERE is_test = 1)"
    )
    db.execute(
        "DELETE FROM comments WHERE user_id IN (SELECT id FROM users WHERE is_test = 1)"
    )
    db.execute("DELETE FROM users WHERE is_test = 1")
    db.commit()
    session.pop("test_credentials", None)
    session["test_notice"] = (
        f"연습 계정 {count}개와 해당 계정의 글을 삭제했습니다. "
        "직접 만든 계정과 글은 유지됩니다."
    )
    return redirect(url_for("admin"))


@app.post("/admin/users/<int:user_id>/block")
def block_user(user_id):
    require_admin()
    db = get_db()
    user = db.execute(
        "SELECT is_admin, is_blocked FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    if user is None:
        abort(404, description="사용자를 찾을 수 없습니다.")
    if user["is_admin"]:
        abort(403, description="관리자 계정은 이 화면에서 차단할 수 없습니다.")

    db.execute(
        "UPDATE users SET is_blocked = ? WHERE id = ?",
        (1 - user["is_blocked"], user_id),
    )
    db.commit()
    return redirect(url_for("admin"))


@app.post("/admin/comments/<int:comment_id>/delete")
def admin_delete_comment(comment_id):
    require_admin()
    db = get_db()
    result = db.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
    db.commit()
    if result.rowcount != 1:
        abort(404, description="추천 글을 찾을 수 없습니다.")
    return redirect(url_for("admin"))


@app.errorhandler(400)
@app.errorhandler(401)
@app.errorhandler(403)
@app.errorhandler(404)
@app.errorhandler(413)
@app.errorhandler(429)
def request_error(error):
    return render_template("error.html", message=error.description), error.code

