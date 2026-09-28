const VERSION = "travel-mate-v2";
const DRAFT_KEY = "week5.travel.draft";
const HISTORY_KEY = "week5.travel.history";
const MAX_HISTORY = 20;

const QUESTIONS = [
  {
    id: "schedule",
    title: "여행 전날, 일정은 어느 정도 정해 둘까?",
    choices: ["시간대별 동선을 미리 정한다", "꼭 갈 곳만 정하고 현장에서 움직인다"],
    scores: [0, 1],
    compromise: "오전 핵심 일정 하나만 예약하고 오후는 비워 두기"
  },
  {
    id: "lodging",
    title: "숙소를 고를 때 더 중요한 것은?",
    choices: ["분위기가 마음에 들면 과감히 선택", "교통과 후기까지 꼼꼼히 확인"],
    scores: [1, 0],
    compromise: "후기 기준을 먼저 통과한 숙소 중 분위기가 좋은 곳 고르기"
  },
  {
    id: "morning",
    title: "여행지의 아침, 어떻게 시작할까?",
    choices: ["푹 자고 여유롭게 브런치 먹기", "일찍 출발해 한적한 명소 보기"],
    scores: [1, 0],
    compromise: "하루는 일출 일정, 다음 날은 늦잠과 브런치로 번갈아 보기"
  },
  {
    id: "food",
    title: "현지에서 유명한 식당의 대기 시간이 70분이라면?",
    choices: ["계획한 맛집이니 기다린다", "근처에서 끌리는 식당을 새로 찾는다"],
    scores: [0, 1],
    compromise: "30분까지만 기다리고 넘으면 미리 봐 둔 후보 식당으로 이동하기"
  },
  {
    id: "detour",
    title: "이동 중 우연히 재미있어 보이는 골목을 발견했다!",
    choices: ["시간을 조금 바꿔서 바로 들어가 본다", "다음 일정이 있으니 지나간다"],
    scores: [1, 0],
    compromise: "15분만 둘러본 뒤 계속 볼지 함께 결정하기"
  },
  {
    id: "budget",
    title: "여행 예산은 어떻게 사용하는 편인가?",
    choices: ["항목별 한도를 정해 고르게 쓴다", "기억에 남을 순간에는 과감히 쓴다"],
    scores: [0, 1],
    compromise: "공동 경비는 한도를 정하고 각자 자유 예산을 따로 마련하기"
  },
  {
    id: "photo",
    title: "멋진 풍경을 만났을 때 나는?",
    choices: ["구도와 장소를 맞춰 사진을 남긴다", "눈으로 충분히 보고 분위기를 즐긴다"],
    scores: [0, 1],
    compromise: "서로 사진을 빠르게 세 장씩 찍어 준 뒤 휴대전화를 넣기"
  },
  {
    id: "trouble",
    title: "길을 잘못 들어 일정이 꼬였다면?",
    choices: ["이것도 여행이라 생각하고 주변을 즐긴다", "현재 위치에서 계획을 다시 정리한다"],
    scores: [1, 0],
    compromise: "10분 동안 주변을 즐긴 뒤 남은 일정 중 하나만 골라 이어가기"
  }
];

const RESULTS = {
  planner: {
    title: "든든한 루트 설계자",
    icon: "🧭",
    description: "시간과 예산을 알차게 쓰도록 여행의 뼈대를 세우는 타입이에요. 함께 가는 사람에게 안정감을 주지만, 예상 밖의 순간을 위한 빈칸도 조금 남겨 보세요.",
    recommendation: "추천 여행법 · 핵심 예약 2개와 이동 동선은 미리 정하고, 하루에 자유 시간 한 칸을 남겨 두세요."
  },
  balanced: {
    title: "유연한 여행 조율자",
    icon: "🗺️",
    description: "계획의 편안함과 즉흥의 즐거움을 상황에 맞게 섞는 타입이에요. 서로 다른 취향을 연결해 여행의 균형을 잡는 역할에 잘 어울립니다.",
    recommendation: "추천 여행법 · 오전은 계획대로 움직이고 오후에는 동행이 번갈아 고른 즉흥 코스를 넣어 보세요."
  },
  explorer: {
    title: "설렘 추적 탐험가",
    icon: "🎒",
    description: "새로운 골목과 예상 밖의 경험에서 여행의 재미를 찾는 타입이에요. 멋진 우연을 잘 발견하지만 꼭 필요한 예약과 예산은 동행과 먼저 합의해 보세요.",
    recommendation: "추천 여행법 · 숙소와 귀가 교통만 확정하고, 그날의 날씨와 기분에 따라 나머지를 선택하세요."
  }
};

const $ = function (selector) {
  return document.querySelector(selector);
};

const memory = { sessionStorage: {}, localStorage: {} };
const unsaved = { sessionStorage: new Set(), localStorage: new Set() };

function inform(message) {
  $("#notice").hidden = false;
  $("#notice").textContent = message;
}

function clearNotice() {
  $("#notice").hidden = true;
  $("#notice").textContent = "";
}

function readJSON(area, key, fallback) {
  let raw;
  try {
    raw = window[area].getItem(key);
    if (unsaved[area].has(key)) raw = memory[area][key] ?? null;
  } catch (error) {
    inform("브라우저 저장소를 사용할 수 없어 이번 화면에서만 기억합니다. 새로고침 후 복원은 배포 페이지에서 확인해 주세요.");
    raw = memory[area][key] ?? null;
  }

  if (raw === null) return fallback;

  try {
    return JSON.parse(raw);
  } catch (error) {
    inform("저장 데이터의 JSON 형식이 잘못되어 안전한 기본값으로 복구했습니다. 게임은 계속할 수 있습니다.");
    return fallback;
  }
}

function writeJSON(area, key, value) {
  const raw = JSON.stringify(value);
  memory[area][key] = raw;
  try {
    window[area].setItem(key, raw);
    unsaved[area].delete(key);
    return true;
  } catch (error) {
    unsaved[area].add(key);
    inform("저장하지 못했습니다. 현재 게임은 계속할 수 있지만 새로고침하면 변경 내용이 사라질 수 있습니다.");
    return false;
  }
}

function removeKey(area, key) {
  delete memory[area][key];
  try {
    window[area].removeItem(key);
    unsaved[area].delete(key);
  } catch (error) {
    unsaved[area].add(key);
    inform("저장소에 접근할 수 없어 실제 삭제 여부를 확인하지 못했습니다. 현재 화면은 초기화했습니다.");
  }
}

function validAnswers(answers, complete) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return false;

  for (const id of Object.keys(answers)) {
    if (!QUESTIONS.some(function (question) { return question.id === id; })) return false;
    if (answers[id] !== 0 && answers[id] !== 1) return false;
  }

  return !complete || QUESTIONS.every(function (question) {
    return Object.hasOwn(answers, question.id);
  });
}

function validBase(value) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    value.version === VERSION &&
    typeof value.id === "string" && value.id.length > 0 &&
    typeof value.nickname === "string" && value.nickname.length <= 20;
}

function loadDraft() {
  const value = readJSON("sessionStorage", DRAFT_KEY, null);
  if (value === null) return null;

  const isValid = validBase(value) && validAnswers(value.answers, false) &&
    Number.isInteger(value.current) && value.current >= 0 && value.current < QUESTIONS.length;

  if (isValid) return value;

  inform("진행 중인 답변의 자료형·질문 ID·선택값 또는 버전이 올바르지 않아 새로 시작합니다.");
  removeKey("sessionStorage", DRAFT_KEY);
  return null;
}

function loadHistory() {
  const value = readJSON("localStorage", HISTORY_KEY, []);
  if (!Array.isArray(value)) {
    inform("완료 기록은 배열이어야 합니다. 빈 목록으로 복구했으며 게임은 계속할 수 있습니다.");
    return [];
  }

  const valid = value.filter(function (record) {
    return validBase(record) && validAnswers(record.answers, true) &&
      typeof record.completedAt === "string" && Number.isFinite(Date.parse(record.completedAt)) &&
      Object.hasOwn(RESULTS, record.type);
  });

  if (valid.length !== value.length) {
    inform("형식이 잘못되었거나 현재 질문과 버전이 다른 기록은 표시와 비교에서 제외했습니다.");
  }
  return valid.slice(-MAX_HISTORY);
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

function resultType(answers) {
  let score = 0;
  for (const question of QUESTIONS) {
    score += question.scores[answers[question.id]];
  }
  if (score * 2 === QUESTIONS.length) return "balanced";
  if (score * 2 > QUESTIONS.length) return "explorer";
  return "planner";
}

let history = loadHistory();
let draft = loadDraft();
let selectedId = null;

if (draft && history.some(function (record) { return record.id === draft.id; })) {
  draft = null;
  removeKey("sessionStorage", DRAFT_KEY);
}

function saveDraft() {
  writeJSON("sessionStorage", DRAFT_KEY, draft);
}

function makeText(tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

function action(label, callback, className) {
  const button = makeText("button", label);
  button.type = "button";
  button.className = className || "button";
  button.addEventListener("click", callback);
  return button;
}

function answerSummary(record) {
  const list = document.createElement("ul");
  for (const question of QUESTIONS) {
    const choice = record.answers[question.id];
    const label = choice === undefined ? "아직 선택하지 않음" : question.choices[choice];
    list.append(makeText("li", question.title + " → " + label));
  }
  return list;
}

function showOnly(id) {
  for (const sectionId of ["home", "quiz", "result"]) {
    $("#" + sectionId).hidden = sectionId !== id;
  }
}

function goHome() {
  showOnly("home");
  selectedId = null;
  $("#comparison").replaceChildren();
  const empty = makeText("option", "친구를 선택하세요");
  empty.value = "";
  $("#friend").replaceChildren(empty);
  $("#nickname").value = "";
  renderHistory();
}

function renderQuestion() {
  if (!draft) {
    goHome();
    return;
  }

  showOnly("quiz");
  const question = QUESTIONS[draft.current];
  $("#step").textContent = "QUESTION " + (draft.current + 1) + " / " + QUESTIONS.length;
  $("#traveler").textContent = draft.nickname + "의 여행 선택";
  $("#progress").max = QUESTIONS.length;
  $("#progress").value = Object.keys(draft.answers).length;
  $("#question").textContent = question.title;
  $("#choices").replaceChildren();

  question.choices.forEach(function (label, index) {
    const button = action("", function () {
      draft.answers[question.id] = index;
      saveDraft();
      renderQuestion();
      $("#choices").children[index].focus();
      renderData();
    }, "choice");
    button.setAttribute("aria-pressed", String(draft.answers[question.id] === index));

    const letter = makeText("span", index === 0 ? "OPTION A" : "OPTION B");
    letter.className = "choice__letter";
    button.append(letter, document.createTextNode(label));
    $("#choices").append(button);
  });

  $("#previous").disabled = draft.current === 0;
  $("#next").disabled = draft.answers[question.id] === undefined;
  $("#next").textContent = draft.current === QUESTIONS.length - 1 ? "여행 카드 완성" : "다음";
}

function finish() {
  if (!draft || !validAnswers(draft.answers, true)) return;

  history = loadHistory();
  const record = {
    id: draft.id,
    version: VERSION,
    nickname: draft.nickname,
    answers: { ...draft.answers },
    type: resultType(draft.answers),
    completedAt: new Date().toISOString()
  };

  if (!history.some(function (item) { return item.id === record.id; })) {
    history.push(record);
    history = history.slice(-MAX_HISTORY);
    writeJSON("localStorage", HISTORY_KEY, history);
  }

  draft = null;
  removeKey("sessionStorage", DRAFT_KEY);
  renderHistory();
  showResult(record.id);
}

function showResult(id) {
  history = loadHistory();
  const record = history.find(function (item) { return item.id === id; });
  if (!record) {
    goHome();
    return;
  }

  selectedId = id;
  showOnly("result");
  const result = RESULTS[record.type];
  $("#result-icon").textContent = result.icon;
  $("#result-title").textContent = result.title;
  $("#result-description").textContent = result.description;
  $("#result-recommendation").textContent = result.recommendation;
  $("#result-owner").textContent = record.nickname + "의 여행 카드 · " +
    new Date(record.completedAt).toLocaleString("ko-KR");
  $("#result-answers").replaceChildren(...answerSummary(record).children);

  const empty = makeText("option", "친구를 선택하세요");
  empty.value = "";
  $("#friend").replaceChildren(empty);
  for (const friend of history) {
    if (friend.id === id) continue;
    const option = makeText("option", friend.nickname + " · " +
      new Date(friend.completedAt).toLocaleString("ko-KR"));
    option.value = friend.id;
    $("#friend").append(option);
  }

  $("#comparison").replaceChildren();
  $("#result-title").focus();
}

function renderComparison() {
  const me = history.find(function (record) { return record.id === selectedId; });
  const friend = history.find(function (record) { return record.id === $("#friend").value; });
  const box = $("#comparison");
  box.replaceChildren();
  if (!me || !friend) return;

  let same = 0;
  const list = document.createElement("ul");
  list.className = "comparison-list";

  for (const question of QUESTIONS) {
    const matches = me.answers[question.id] === friend.answers[question.id];
    if (matches) same += 1;

    const item = document.createElement("li");
    item.className = "comparison-item" + (matches ? "" : " comparison-item--different");
    item.append(makeText("strong", (matches ? "같아요 · " : "달라요 · ") + question.title));
    item.append(makeText("span", me.nickname + ": " + question.choices[me.answers[question.id]] +
      " / " + friend.nickname + ": " + question.choices[friend.answers[question.id]]));
    if (!matches) {
      const tip = makeText("span", "타협 아이디어 · " + question.compromise);
      tip.className = "compromise";
      item.append(tip);
    }
    list.append(item);
  }

  const summary = makeText("p", QUESTIONS.length + "개 중 " + same + "개가 같아요. " +
    (same >= 6 ? "이미 호흡이 잘 맞는 여행 친구예요!" : "다른 선택은 여행 전에 타협안을 하나씩 정해 보세요."));
  summary.className = "comparison-summary";
  box.append(summary, list);
}

function renderHistory() {
  $("#history-count").textContent = "저장된 결과 " + history.length + "개";
  $("#resume").disabled = draft === null;
  const box = $("#history");
  box.replaceChildren();

  if (history.length === 0) {
    box.append(makeText("p", "아직 완료 기록이 없습니다. 첫 번째 여행자가 되어 보세요!"));
  }

  for (const record of [...history].reverse()) {
    const card = document.createElement("article");
    card.className = "record";
    const text = document.createElement("div");
    text.className = "record__text";
    text.append(makeText("strong", record.nickname + " · " + RESULTS[record.type].title));
    const time = makeText("p", new Date(record.completedAt).toLocaleString("ko-KR"));
    time.className = "record__meta";
    text.append(time);

    const buttons = document.createElement("div");
    buttons.className = "actions";
    buttons.append(
      action("결과 보기", function () { showResult(record.id); }),
      action("기록 삭제", function () { deleteRecord(record.id); })
    );
    card.append(text, buttons);
    box.append(card);
  }
  renderData();
}

function renderData() {
  if ($("#data-view").hidden) return;

  const draftBox = $("#draft-data");
  draftBox.replaceChildren();
  if (!draft) {
    draftBox.append(makeText("p", "진행 중인 답변이 없습니다."));
  } else {
    draftBox.append(makeText("p", draft.nickname + " · 현재 " + (draft.current + 1) + "번 문항"));
    draftBox.append(answerSummary(draft));
  }

  const historyBox = $("#history-data");
  historyBox.replaceChildren();
  if (history.length === 0) {
    historyBox.append(makeText("p", "완료 기록이 없습니다."));
  }

  for (const record of history) {
    const card = document.createElement("article");
    card.className = "record";
    card.append(makeText("p", record.nickname + " · " + RESULTS[record.type].title + " · " +
      new Date(record.completedAt).toLocaleString("ko-KR")));
    card.append(answerSummary(record));
    card.append(action("이 기록 삭제", function () { deleteRecord(record.id); }));
    historyBox.append(card);
  }
}

function deleteRecord(id) {
  history = loadHistory().filter(function (record) { return record.id !== id; });
  writeJSON("localStorage", HISTORY_KEY, history);
  if (selectedId === id) {
    goHome();
    return;
  }
  if (selectedId) showResult(selectedId);
  renderHistory();
}

function deleteDraft() {
  draft = null;
  removeKey("sessionStorage", DRAFT_KEY);
  goHome();
}

$("#start").addEventListener("click", function () {
  clearNotice();
  history = loadHistory();
  const nickname = $("#nickname").value.trim().slice(0, 20) || "참가자 " + (history.length + 1);
  draft = { id: makeId(), version: VERSION, nickname: nickname, current: 0, answers: {} };
  saveDraft();
  renderHistory();
  renderQuestion();
  $("#question").focus();
});

$("#resume").addEventListener("click", function () {
  if (draft) {
    renderQuestion();
    $("#question").focus();
  }
});

$("#previous").addEventListener("click", function () {
  if (!draft || draft.current === 0) return;
  draft.current -= 1;
  saveDraft();
  renderQuestion();
  renderData();
  $("#question").focus();
});

$("#next").addEventListener("click", function () {
  if (!draft || draft.answers[QUESTIONS[draft.current].id] === undefined) return;
  if (draft.current === QUESTIONS.length - 1) {
    finish();
    return;
  }
  draft.current += 1;
  saveDraft();
  renderQuestion();
  renderData();
  $("#question").focus();
});

$("#friend").addEventListener("change", renderComparison);
$("#next-person").addEventListener("click", deleteDraft);
$("#go-home").addEventListener("click", goHome);
$("#delete-draft").addEventListener("click", deleteDraft);

$("#delete-all").addEventListener("click", function () {
  draft = null;
  history = [];
  selectedId = null;
  removeKey("sessionStorage", DRAFT_KEY);
  removeKey("localStorage", HISTORY_KEY);
  $("#data-view").hidden = true;
  goHome();
  inform("이 게임의 진행 중인 답변과 완료 기록을 모두 삭제했습니다. 다른 주차의 저장 데이터는 건드리지 않았습니다.");
});

$("#inspect").addEventListener("click", function () {
  clearNotice();
  history = loadHistory();
  draft = loadDraft();
  $("#data-view").hidden = false;

  if (selectedId) {
    showResult(selectedId);
  } else if (!$("#quiz").hidden) {
    if (draft) renderQuestion();
    else goHome();
  }
  renderHistory();
});

renderHistory();
