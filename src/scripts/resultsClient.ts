import { formatImportedMark, loadImportStore } from "../lib/trackImport";

const importedSection = document.querySelector("[data-imported-results]");
const staticSection = document.querySelector("[data-static-results]");
const meetList = document.querySelector("[data-imported-meets]");

const formatDateValue = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));

const renderMeet = (meet) => {
  const card = document.createElement("article");
  card.className = "rounded-lg border border-slate-200 bg-white p-4 shadow-sm";

  const header = document.createElement("div");
  header.className = "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between";

  const titleWrap = document.createElement("div");
  const title = document.createElement("h2");
  title.className = "text-lg font-semibold text-slate-900";
  title.textContent = meet.name;
  titleWrap.appendChild(title);

  if (meet.date) {
    const date = document.createElement("p");
    date.className = "text-sm text-slate-600";
    date.textContent = formatDateValue(meet.date);
    titleWrap.appendChild(date);
  }

  const meta = document.createElement("div");
  meta.className = "text-sm text-slate-600";
  if (meet.season) {
    const season = document.createElement("p");
    season.textContent = meet.season;
    meta.appendChild(season);
  }
  if (meet.location) {
    const location = document.createElement("p");
    location.textContent = meet.location;
    meta.appendChild(location);
  }

  header.appendChild(titleWrap);
  header.appendChild(meta);
  card.appendChild(header);

  const details = document.createElement("details");
  details.className = "mt-3";
  const summary = document.createElement("summary");
  summary.className = "cursor-pointer text-sm font-medium text-blue-600";
  summary.textContent = "View results";
  details.appendChild(summary);

  const tableWrap = document.createElement("div");
  tableWrap.className = "mt-3 overflow-hidden rounded-lg border border-slate-200";

  const table = document.createElement("table");
  table.className = "w-full text-left text-sm";
  table.innerHTML = `
    <thead class="bg-slate-50 text-slate-600">
      <tr>
        <th class="px-4 py-3 font-medium">Athlete</th>
        <th class="px-4 py-3 font-medium">Event</th>
        <th class="px-4 py-3 font-medium">Mark</th>
        <th class="px-4 py-3 font-medium">Team</th>
      </tr>
    </thead>
  `;

  const body = document.createElement("tbody");
  const sortedPerformances = [...meet.performances].sort((a, b) => {
    const eventCompare = a.eventName.localeCompare(b.eventName);
    if (eventCompare !== 0) return eventCompare;
    return a.athleteLast.localeCompare(b.athleteLast);
  });

  sortedPerformances.forEach((performance) => {
    const row = document.createElement("tr");
    row.className = "border-t border-slate-200";
    row.innerHTML = `
      <td class="px-4 py-3">${performance.athleteFirst} ${performance.athleteLast}</td>
      <td class="px-4 py-3">${performance.eventName}</td>
      <td class="px-4 py-3">${formatImportedMark(
        performance.markRaw,
        performance.markValue,
        performance.markType
      )}</td>
      <td class="px-4 py-3">${performance.team ?? "—"}</td>
    `;
    body.appendChild(row);
  });

  table.appendChild(body);
  tableWrap.appendChild(table);
  details.appendChild(tableWrap);
  card.appendChild(details);
  return card;
};

const renderImportedResults = (store) => {
  if (!importedSection || !staticSection || !meetList) return;
  if (!store.meets.length) {
    importedSection.classList.add("hidden");
    staticSection.classList.remove("hidden");
    return;
  }

  importedSection.classList.remove("hidden");
  staticSection.classList.add("hidden");
  meetList.replaceChildren();
  store.meets.forEach((meet) => meetList.appendChild(renderMeet(meet)));
};

const store = loadImportStore();
renderImportedResults(store);
window.addEventListener("track:imports-updated", (event) => {
  renderImportedResults(event.detail);
});
