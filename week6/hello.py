from flask import Flask, render_template, request

app = Flask(__name__)


@app.get("/")
def index():
    return '<h1>Flask 실행 성공!</h1><a href="/hello?name=건우">인사 페이지</a>'


@app.get("/hello")
def hello():
    name = request.args.get("name", "새 친구").strip()[:30] or "새 친구"
    return render_template("hello.html", name=name)
