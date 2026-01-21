import { formatImportedMark, getAthletesFromStore, loadImportStore } from "../lib/trackImport";

const importedSection = document.querySelector("[data-imported-athletes]");
const staticSection = document.querySelector("[data-static-athletes]");
const listContainer = document.querySelector("[data-athlete-list]");
const detailContainer = document.querySelector("[data-athlete-detail]");

const formatDateValue = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));

const renderDetail = (athlete) => {
  if (!detailContainer) return;
  detailContainer.replaceChildren();

  const header = document.createElement("div");
  header.className = "space-y-1";
  header.innerHTML = `
    <p class="text-sm text-slate-500">Athlete Profile</p>
    <h3 class="text-xl font-semibold text-slate-900">${athlete.first} ${athlete.last}</h3>
    <p class="text-sm text-slate-600">
      ${athlete.grade ? `Grade ${athlete.grade}` : "Grade not listed"}
      ${athlete.gender ? ` · ${athlete.gender === "F" ? "Girls" : "Boys"}` : ""}
      ${athlete.team ? ` · ${athlete.team}` : ""}
    </p>
  `;

  detailContainer.appendChild(header);

  if (!athlete.performances.length) {
    const empty = document.createElement("p");
    empty.className = "mt-3 text-sm text-slate-600";
    empty.textContent = "No performances loaded yet.";
    detailContainer.appendChild(empty);
    return;
  }

  const groups = new Map();
  athlete.performances.forEach((performance) => {
    if (!groups.has(performance.eventName)) {
      groups.set(performance.eventName, []);
    }
    groups.get(performance.eventName).push(performance);
  });

  const groupEntries = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const groupWrap = document.createElement("div");
  groupWrap.className = "mt-4 space-y-4";

  groupEntries.forEach(([eventName, performances]) => {
    const card = document.createElement("div");
    card.className = "rounded-lg border border-slate-200 bg-white p-4";

    const title = document.createElement("h4");
    title.className = "text-lg font-semibold text-slate-900";
    title.textContent = eventName;
    card.appendChild(title);

    const list = document.createElement("ul");
    list.className = "mt-3 space-y-2 text-sm text-slate-700";

    performances
      .slice()
      .sort((a, b) => (a.meetDate ?? "").localeCompare(b.meetDate ?? ""))
      .forEach((performance) => {
        const item = document.createElement("li");
        item.className = "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between";
        const meta = document.createElement("span");
        const meetInfo = performance.meetDate
          ? `${performance.meetName} · ${formatDateValue(performance.meetDate)}`
          : performance.meetName;
        meta.textContent = meetInfo;

        const mark = document.createElement("span");
        mark.className = "font-medium";
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
    groupWrap.appendChild(card);
  });

  detailContainer.appendChild(groupWrap);
};

const renderList = (athletes) => {
  if (!listContainer) return;
  listContainer.replaceChildren();

  athletes.forEach((athlete, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50";
    button.textContent = `${athlete.first} ${athlete.last}${
      athlete.team ? ` · ${athlete.team}` : ""
    }`;
    button.addEventListener("click", () => renderDetail(athlete));
    if (index === 0) renderDetail(athlete);
    listContainer.appendChild(button);
  });
};

const renderImportedAthletes = (store) => {
  if (!importedSection || !staticSection) return;
  if (!store.meets.length) {
    importedSection.classList.add("hidden");
    staticSection.classList.remove("hidden");
    return;
  }
  importedSection.classList.remove("hidden");
  staticSection.classList.add("hidden");
  const athletes = getAthletesFromStore(store);
  renderList(athletes);
};

const store = loadImportStore();
renderImportedAthletes(store);
window.addEventListener("track:imports-updated", (event) => {
  renderImportedAthletes(event.detail);
});
