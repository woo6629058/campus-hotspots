const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const startButton = document.querySelector("#start-button");
const scoreText = document.querySelector("#score");
const timeText = document.querySelector("#time");
const livesText = document.querySelector("#lives");
const levelText = document.querySelector("#level");
const message = document.querySelector("#game-message");

const GAME_SECONDS = 30;
const STAR_RADIUS = 24;
const backgroundStars = [];
const levelNames = ["하랑의 온기", "하늘동산의 벚꽃", "도서관의 책빛", "성심교정의 밤길"];
let constellation = [];
let connectedCount = 0;
let score = 0;
let lives = 3;
let level = 1;
let completedLevels = 0;
let currentPathName = levelNames[0];
let running = false;
let startTime = 0;
let animationId = 0;
let levelPauseUntil = 0;
let pointer = { x: -100, y: -100 };
let flash = { type: "", until: 0 };

function createBackgroundStars() {
  backgroundStars.length = 0;
  for (let index = 0; index < 90; index += 1) {
    backgroundStars.push({
      x: (index * 137) % canvas.width,
      y: (index * 83) % (canvas.height - 70),
      radius: 0.7 + (index % 4) * 0.35,
      alpha: 0.25 + (index % 5) * 0.12
    });
  }
}

function drawBackground(timestamp) {
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#0a1230");
  sky.addColorStop(0.58, "#243d6d");
  sky.addColorStop(1, "#725a78");
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < backgroundStars.length; index += 1) {
    const star = backgroundStars[index];
    const twinkle = 0.16 * Math.sin(timestamp / 520 + index);
    context.beginPath();
    context.fillStyle = `rgb(255 247 211 / ${Math.max(0.12, star.alpha + twinkle)})`;
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "#0c1530";
  context.beginPath();
  context.moveTo(0, canvas.height);
  context.lineTo(0, canvas.height - 58);
  context.lineTo(95, canvas.height - 105);
  context.lineTo(185, canvas.height - 72);
  context.lineTo(310, canvas.height - 122);
  context.lineTo(430, canvas.height - 76);
  context.lineTo(565, canvas.height - 130);
  context.lineTo(700, canvas.height - 78);
  context.lineTo(815, canvas.height - 112);
  context.lineTo(canvas.width, canvas.height - 64);
  context.lineTo(canvas.width, canvas.height);
  context.closePath();
  context.fill();

  // 원미산 능선 사이로 보이는 성심교정 건물 실루엣입니다.
  context.fillStyle = "#121d35";
  context.fillRect(96, canvas.height - 93, 142, 47);
  context.beginPath();
  context.moveTo(86, canvas.height - 93);
  context.lineTo(167, canvas.height - 116);
  context.lineTo(248, canvas.height - 93);
  context.closePath();
  context.fill();

  context.fillRect(356, canvas.height - 108, 188, 62);
  context.fillRect(395, canvas.height - 126, 110, 18);

  context.fillRect(655, canvas.height - 99, 158, 53);
  context.fillRect(685, canvas.height - 117, 98, 18);
  context.beginPath();
  context.moveTo(674, canvas.height - 117);
  context.lineTo(734, canvas.height - 136);
  context.lineTo(794, canvas.height - 117);
  context.closePath();
  context.fill();

  context.fillStyle = "#f5d58b";
  const windowRows = [
    { startX: 112, endX: 225, y: canvas.height - 74, gap: 29 },
    { startX: 374, endX: 526, y: canvas.height - 86, gap: 36 },
    { startX: 374, endX: 526, y: canvas.height - 61, gap: 36 },
    { startX: 673, endX: 800, y: canvas.height - 77, gap: 34 },
    { startX: 673, endX: 800, y: canvas.height - 56, gap: 34 }
  ];
  for (const row of windowRows) {
    for (let x = row.startX; x < row.endX; x += row.gap) {
      context.globalAlpha = 0.58 + ((x + row.y) % 3) * 0.16;
      context.fillRect(x, row.y, 8, 9);
    }
  }
  context.globalAlpha = 1;

  context.fillStyle = "#0a1228";
  context.beginPath();
  context.moveTo(0, canvas.height - 40);
  context.quadraticCurveTo(155, canvas.height - 72, 305, canvas.height - 43);
  context.quadraticCurveTo(470, canvas.height - 73, 620, canvas.height - 42);
  context.quadraticCurveTo(760, canvas.height - 65, canvas.width, canvas.height - 38);
  context.lineTo(canvas.width, canvas.height);
  context.lineTo(0, canvas.height);
  context.closePath();
  context.fill();
  const pathLights = [
    { x: 42, y: canvas.height - 27, size: 3.2 },
    { x: 128, y: canvas.height - 39, size: 3.8 },
    { x: 218, y: canvas.height - 31, size: 2.8 },
    { x: 318, y: canvas.height - 43, size: 3.5 },
    { x: 433, y: canvas.height - 34, size: 3 },
    { x: 548, y: canvas.height - 45, size: 3.8 },
    { x: 653, y: canvas.height - 35, size: 2.7 },
    { x: 758, y: canvas.height - 41, size: 3.4 },
    { x: 852, y: canvas.height - 28, size: 2.9 }
  ];
  for (const light of pathLights) {
    const glow = context.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.size * 5);
    glow.addColorStop(0, "rgb(255 231 157 / 75%)");
    glow.addColorStop(1, "rgb(255 215 122 / 0%)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(light.x, light.y, light.size * 5, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#46506a";
    context.fillRect(light.x - 1, light.y + light.size, 2, 8 + light.size);
    context.fillStyle = "#ffe6a0";
    context.beginPath();
    context.arc(light.x, light.y, light.size, 0, Math.PI * 2);
    context.fill();
  }
}

function isFarEnough(candidate, points) {
  return points.every(function (point) {
    return Math.hypot(candidate.x - point.x, candidate.y - point.y) >= 105;
  });
}

function createConstellation() {
  const pointCount = Math.min(4 + level, 9);
  const points = [];
  let attempts = 0;

  while (points.length < pointCount && attempts < 500) {
    const candidate = {
      x: 75 + Math.random() * (canvas.width - 150),
      y: 75 + Math.random() * (canvas.height - 190)
    };
    if (isFarEnough(candidate, points)) points.push(candidate);
    attempts += 1;
  }

  while (points.length < pointCount) {
    const index = points.length;
    points.push({
      x: 90 + (index % 5) * 170,
      y: 95 + Math.floor(index / 5) * 175
    });
  }

  constellation = points;
  connectedCount = 0;
  levelPauseUntil = 0;
  currentPathName = levelNames[(level - 1) % levelNames.length];
  message.textContent = `${currentPathName}: 1번 별부터 이어 보세요.`;
}

function drawPath() {
  if (!constellation.length) return;

  context.lineWidth = 5;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#ffd56d";
  context.shadowColor = "#ffe9a6";
  context.shadowBlur = 16;
  context.beginPath();
  for (let index = 0; index < connectedCount; index += 1) {
    const point = constellation[index];
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  }
  context.stroke();

  if (running && connectedCount > 0 && connectedCount < constellation.length && !levelPauseUntil) {
    const last = constellation[connectedCount - 1];
    context.save();
    context.setLineDash([9, 10]);
    context.lineWidth = 2;
    context.strokeStyle = "rgb(255 235 171 / 55%)";
    context.shadowBlur = 0;
    context.beginPath();
    context.moveTo(last.x, last.y);
    context.lineTo(pointer.x, pointer.y);
    context.stroke();
    context.restore();
  }

  context.shadowBlur = 0;
}

function drawConstellationStar(point, index, timestamp) {
  const isConnected = index < connectedCount;
  const isNext = running && index === connectedCount && !levelPauseUntil;
  const pulse = isNext ? 1 + Math.sin(timestamp / 170) * 0.12 : 1;
  const radius = STAR_RADIUS * pulse;

  context.save();
  context.translate(point.x, point.y);
  context.beginPath();
  context.arc(0, 0, radius + (isNext ? 9 : 4), 0, Math.PI * 2);
  context.fillStyle = isNext ? "rgb(255 220 113 / 24%)" : "rgb(255 255 255 / 10%)";
  context.fill();

  context.beginPath();
  for (let corner = 0; corner < 10; corner += 1) {
    const angle = -Math.PI / 2 + corner * Math.PI / 5;
    const pointRadius = corner % 2 === 0 ? radius : radius * 0.45;
    const x = Math.cos(angle) * pointRadius;
    const y = Math.sin(angle) * pointRadius;
    if (corner === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fillStyle = isConnected ? "#ffd35f" : isNext ? "#fff1a8" : "#b8c5df";
  context.strokeStyle = isNext ? "#fff8d8" : "#dce5f6";
  context.lineWidth = isNext ? 4 : 2;
  context.shadowColor = isConnected || isNext ? "#ffe59a" : "#8298c2";
  context.shadowBlur = isConnected || isNext ? 18 : 7;
  context.fill();
  context.stroke();

  context.shadowBlur = 0;
  context.fillStyle = isConnected ? "#2a2541" : "#17223b";
  context.font = "800 17px system-ui";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(index + 1), 0, 1);
  context.restore();
}

function drawScene(timestamp = 0) {
  drawBackground(timestamp);
  drawPath();
  for (let index = 0; index < constellation.length; index += 1) {
    drawConstellationStar(constellation[index], index, timestamp);
  }

  context.fillStyle = "rgb(5 11 29 / 62%)";
  context.fillRect(0, 0, canvas.width, 45);
  context.fillStyle = "#fff0b8";
  context.font = "700 18px system-ui";
  context.textAlign = "left";
  context.fillText(`현재 길: ${currentPathName}`, 22, 29);

  if (flash.until > timestamp) {
    context.fillStyle = flash.type === "wrong" ? "rgb(190 52 74 / 18%)" : "rgb(255 218 102 / 13%)";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function updateStatus(remainingSeconds) {
  scoreText.textContent = String(score);
  timeText.textContent = String(Math.max(0, Math.ceil(remainingSeconds)));
  livesText.textContent = String(lives);
  levelText.textContent = String(level);
}

function finishGame(reason) {
  running = false;
  cancelAnimationFrame(animationId);
  startButton.textContent = "다시 시작";
  startButton.removeAttribute("disabled");
  const reasonText = reason === "lives" ? "순서를 세 번 틀려 산책이 끝났습니다." : "30초 별빛 산책이 끝났습니다.";
  message.textContent = `${reasonText} 최종 점수는 ${score}점, 완성한 길은 ${completedLevels}개입니다.`;
  drawScene(performance.now());
  context.fillStyle = "rgb(5 10 27 / 76%)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#fff4c7";
  context.textAlign = "center";
  context.font = "800 42px system-ui";
  context.fillText("별빛 산책 완료!", canvas.width / 2, canvas.height / 2 - 28);
  context.font = "700 24px system-ui";
  context.fillText(`최종 점수 ${score}점 · 완성한 길 ${completedLevels}개`, canvas.width / 2, canvas.height / 2 + 24);
}

function completeLevel(timestamp) {
  const bonus = level * 150;
  score += bonus;
  completedLevels += 1;
  flash = { type: "complete", until: timestamp + 650 };
  message.textContent = `${level}단계 완성! 보너스 ${bonus}점. 다음 산책로가 열립니다.`;
  level += 1;
  updateStatus(GAME_SECONDS - (timestamp - startTime) / 1000);
  levelPauseUntil = timestamp + 900;
}

function update(timestamp) {
  if (!running) return;
  const remainingSeconds = GAME_SECONDS - (timestamp - startTime) / 1000;

  if (remainingSeconds <= 0) {
    updateStatus(0);
    finishGame("time");
    return;
  }

  if (levelPauseUntil && timestamp >= levelPauseUntil) createConstellation();
  updateStatus(remainingSeconds);
  drawScene(timestamp);
  animationId = requestAnimationFrame(update);
}

function canvasPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
    y: (event.clientY - bounds.top) * (canvas.height / bounds.height)
  };
}

function selectStar(point, timestamp) {
  if (!running || levelPauseUntil) return;
  let selectedIndex = -1;
  let selectedDistance = Infinity;
  for (let index = 0; index < constellation.length; index += 1) {
    const distance = Math.hypot(point.x - constellation[index].x, point.y - constellation[index].y);
    if (distance <= STAR_RADIUS + 16 && distance < selectedDistance) {
      selectedIndex = index;
      selectedDistance = distance;
    }
  }
  if (selectedIndex < 0) return;

  if (selectedIndex === connectedCount) {
    connectedCount += 1;
    score += 100;
    flash = { type: "correct", until: timestamp + 230 };
    if (connectedCount === constellation.length) completeLevel(timestamp);
    else message.textContent = `좋아요! 이제 ${connectedCount + 1}번 별을 선택하세요.`;
  } else if (selectedIndex < connectedCount) {
    message.textContent = `${selectedIndex + 1}번 별은 이미 연결했습니다. ${connectedCount + 1}번을 찾아보세요.`;
  } else {
    lives -= 1;
    flash = { type: "wrong", until: timestamp + 420 };
    message.textContent = `순서가 달라요. 다음 별은 ${connectedCount + 1}번입니다. 남은 기회 ${lives}개.`;
    if (lives <= 0) {
      updateStatus(GAME_SECONDS - (timestamp - startTime) / 1000);
      finishGame("lives");
      return;
    }
  }
  updateStatus(GAME_SECONDS - (timestamp - startTime) / 1000);
}

function startGame() {
  cancelAnimationFrame(animationId);
  score = 0;
  lives = 3;
  level = 1;
  completedLevels = 0;
  running = true;
  flash = { type: "", until: 0 };
  pointer = { x: -100, y: -100 };
  createConstellation();
  startTime = performance.now();
  startButton.textContent = "진행 중";
  startButton.setAttribute("disabled", "");
  updateStatus(GAME_SECONDS);
  canvas.focus();
  animationId = requestAnimationFrame(update);
}

startButton.addEventListener("click", startGame);

canvas.addEventListener("pointermove", function (event) {
  pointer = canvasPoint(event);
});

canvas.addEventListener("pointerleave", function () {
  pointer = { x: -100, y: -100 };
});

canvas.addEventListener("pointerdown", function (event) {
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  pointer = canvasPoint(event);
  selectStar(pointer, performance.now());
});

createBackgroundStars();
createConstellation();
updateStatus(GAME_SECONDS);
drawScene();
