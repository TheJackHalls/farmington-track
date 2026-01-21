import { buildLeaderboards, formatImportedMark, loadImportStore } from "../lib/trackImport";

const importedSection = document.querySelector("[data-imported-leaderboards]");
const staticSection = document.querySelector("[data-static-leaderboards]");
const boardList = document.querySelector("[data-imported-boards]");

const formatDateValue = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));

const renderBoard = (board) => {
  const card = document.createElement("div");
  card.className = "rounded-lg border border-slate-200 bg-white p-4 shadow-sm";

  const title = document.createElement("h2");
  title.className = "text-lg font-semibold text-slate-900";
  title.textContent = board.eventName;
  card.appendChild(title);

  if (!board.performances.length) {
    const empty = document.createElement("p");
    empty.className = "mt-3 text-sm text-slate-600";
    empty.textContent = "No performances yet.";
    card.appendChild(empty);
    return card;
  }

  const list = document.createElement("ul");
  list.className = "mt-3 space-y-2 text-sm text-slate-700";

  board.performances.forEach((performance, index) => {
    const item = document.createElement("li");
    item.className = "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between";
    const meta = document.createElement("span");
    const meetInfo = performance.meetDate
      ? `${performance.meetName} (${formatDateValue(performance.meetDate)})`
      : performance.meetName;
    meta.innerHTML = `<span class="font-medium">#${index + 1}</span> ${
      performance.athleteName
    } <span class="text-slate-500">· ${meetInfo}</span>`;

    const mark = document.createElement("span");
    mark.className = "font-semibold";
    mark.textContent = formatImportedMark(
      performance.markRaw,
      performance.markValue,
      performance.markType
    );

    item.appendChild(meta);
    item.appendChild(mark);
    list.appendChild(item);
  });

  card.appendChild(list);
  return card;
};

const renderLeaderboards = (store) => {
  if (!importedSection || !staticSection || !boardList) return;
  if (!store.meets.length) {
    importedSection.classList.add("hidden");
    staticSection.classList.remove("hidden");
    return;
  }

  importedSection.classList.remove("hidden");
  staticSection.classList.add("hidden");
  boardList.replaceChildren();
  const boards = buildLeaderboards(store, 5);
  boards.forEach((board) => boardList.appendChild(renderBoard(board)));
};

const store = loadImportStore();
renderLeaderboards(store);
window.addEventListener("track:imports-updated", (event) => {
  renderLeaderboards(event.detail);
});
