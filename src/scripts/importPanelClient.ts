import {
  buildMeetFromCsv,
  clearImportStore,
  getImportSummary,
  loadImportStore,
  saveImportStore
} from "../lib/trackImport";

const updateSummary = (summaryEl: Element | null, store) => {
  if (!summaryEl) return;
  const summary = getImportSummary(store);
  if (!summary.meets) {
    summaryEl.textContent = "No imports yet.";
    return;
  }
  summaryEl.textContent = `${summary.meets} meet${summary.meets === 1 ? "" : "s"} · ${
    summary.performances
  } performances · ${summary.athletes} athletes`;
};

const updateStatus = (statusEl: Element | null, message: string, tone = "neutral") => {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.remove("text-red-600", "text-green-600", "text-slate-600");
  if (tone === "error") statusEl.classList.add("text-red-600");
  else if (tone === "success") statusEl.classList.add("text-green-600");
  else statusEl.classList.add("text-slate-600");
};

const updateWarnings = (warningsEl: Element | null, warnings: string[]) => {
  if (!warningsEl) return;
  warningsEl.replaceChildren();
  warnings.forEach((warning) => {
    const item = document.createElement("li");
    item.textContent = warning;
    warningsEl.appendChild(item);
  });
};

const dispatchUpdate = (store) => {
  window.dispatchEvent(new CustomEvent("track:imports-updated", { detail: store }));
};

const handlePanel = (panel: Element) => {
  const form = panel.querySelector("[data-import-form]");
  const fileInput = form?.querySelector('input[type="file"]') as HTMLInputElement | null;
  const nameInput = form?.querySelector('input[name="meetName"]') as HTMLInputElement | null;
  const dateInput = form?.querySelector('input[name="meetDate"]') as HTMLInputElement | null;
  const seasonInput = form?.querySelector('input[name="meetSeason"]') as HTMLInputElement | null;
  const locationInput = form?.querySelector(
    'input[name="meetLocation"]'
  ) as HTMLInputElement | null;
  const sourceInput = form?.querySelector(
    'select[name="meetSource"]'
  ) as HTMLSelectElement | null;
  const statusEl = panel.querySelector("[data-import-status]");
  const summaryEl = panel.querySelector("[data-import-summary]");
  const warningsEl = panel.querySelector("[data-import-warnings]");
  const clearButton = panel.querySelector("[data-import-clear]");

  const handleFileName = (file: File) => {
    if (!nameInput?.value.trim()) {
      nameInput.value = file.name.replace(/\.csv$/i, "").replace(/[_-]+/g, " ");
    }
  };

  const renderSummary = () => {
    const store = loadImportStore();
    updateSummary(summaryEl, store);
  };

  fileInput?.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];
    if (file) handleFileName(file);
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = fileInput?.files?.[0];
    if (!file) {
      updateStatus(statusEl, "Please choose a CSV file to import.", "error");
      return;
    }

    const text = await file.text();
    const { meet, warnings, totalRows } = buildMeetFromCsv(text, {
      name: nameInput?.value.trim() || file.name.replace(/\.csv$/i, ""),
      date: dateInput?.value || undefined,
      season: seasonInput?.value.trim() || undefined,
      location: locationInput?.value.trim() || undefined,
      source: sourceInput?.value || undefined
    });

    updateWarnings(warningsEl, warnings);

    if (!meet || !meet.performances.length) {
      updateStatus(statusEl, "No usable performances were found in this CSV.", "error");
      return;
    }

    const store = loadImportStore();
    store.meets = [meet, ...store.meets];
    saveImportStore(store);
    updateSummary(summaryEl, store);
    updateStatus(
      statusEl,
      `Imported ${meet.performances.length} performances from ${totalRows} rows.`,
      "success"
    );
    dispatchUpdate(store);
    form?.reset();
  });

  clearButton?.addEventListener("click", () => {
    clearImportStore();
    const store = loadImportStore();
    updateSummary(summaryEl, store);
    updateWarnings(warningsEl, []);
    updateStatus(statusEl, "Imports cleared.", "success");
    dispatchUpdate(store);
  });

  renderSummary();
};

document.querySelectorAll("[data-track-import-panel]").forEach(handlePanel);
