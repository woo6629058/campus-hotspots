const places = [
  {
    id: "cafe",
    name: "카페 하랑",
    query: "가톨릭대학교 니콜스관",
    embed: "https://maps.google.com/maps?q=%EA%B0%80%ED%86%A8%EB%A6%AD%EB%8C%80%ED%95%99%EA%B5%90%20%EB%8B%88%EC%BD%9C%EC%8A%A4%EA%B4%80&output=embed"
  },
  {
    id: "garden",
    name: "하늘동산",
    query: "가톨릭대학교 성심교정 하늘동산",
    embed: "https://maps.google.com/maps?q=%EA%B0%80%ED%86%A8%EB%A6%AD%EB%8C%80%ED%95%99%EA%B5%90%20%EC%84%B1%EC%8B%AC%EA%B5%90%EC%A0%95%20%ED%95%98%EB%8A%98%EB%8F%99%EC%82%B0&output=embed"
  },
  {
    id: "library",
    name: "중앙도서관",
    query: "가톨릭대학교 베리타스관",
    embed: "https://maps.google.com/maps?q=%EA%B0%80%ED%86%A8%EB%A6%AD%EB%8C%80%ED%95%99%EA%B5%90%20%EB%B2%A0%EB%A6%AC%ED%83%80%EC%8A%A4%EA%B4%80&output=embed"
  }
];

const buttonArea = document.querySelector("#place-buttons");
const sections = document.querySelectorAll(".place-panel");
const map = document.querySelector("#map");
const mapLink = document.querySelector("#map-link");
const status = document.querySelector("#selection-status");

function selectPlace(place) {
  for (const section of sections) {
    section.hidden = section.id !== place.id;
  }

  for (const button of buttonArea.querySelectorAll("button")) {
    const isSelected = button.dataset.place === place.id;
    button.setAttribute("aria-pressed", String(isSelected));
  }

  document.body.dataset.activePlace = place.id;
  map.src = place.embed;
  map.title = `${place.name} Google 지도`;
  mapLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.query)}`;
  mapLink.textContent = `${place.name} 지도 크게 보기`;
  status.textContent = `${place.name}의 설명과 지도를 표시했습니다.`;
}

for (const place of places) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = place.name;
  button.dataset.place = place.id;
  button.setAttribute("aria-controls", place.id);
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", function () {
    selectPlace(place);
  });
  buttonArea.append(button);
}

selectPlace(places[0]);
