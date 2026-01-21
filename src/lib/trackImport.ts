export type ImportedPerformance = {
  athleteId: string;
  athleteFirst: string;
  athleteLast: string;
  eventName: string;
  markRaw: string;
  markValue: number | null;
  markType: "time" | "distance" | "unknown";
  gender?: string;
  grade?: string;
  team?: string;
};

export type ImportedMeet = {
  id: string;
  name: string;
  date?: string;
  location?: string;
  season?: string;
  source?: string;
  importedAt: string;
  performances: ImportedPerformance[];
};

export type ImportedDataStore = {
  version: 1;
  meets: ImportedMeet[];
};

type CsvFieldMap = {
  event: number;
  result: number;
  first: number;
  last: number;
  name: number;
  gender: number;
  grade: number;
  team: number;
};

const STORAGE_KEY = "vaultcoach.track.imports";

const HEADER_SYNONYMS: Record<keyof CsvFieldMap, string[]> = {
  event: ["event", "eventname", "eventtitle"],
  result: ["result", "mark", "time", "performance", "finalmark", "distance"],
  first: ["firstname", "first", "givenname", "athletefirstname", "firstname1"],
  last: ["lastname", "last", "surname", "familyname", "athletelastname", "lastname1"],
  name: ["athlete", "name", "competitor", "runner"],
  gender: ["gender", "sex"],
  grade: ["grade", "gradeyear", "year", "grade1"],
  team: ["team", "school", "club", "teamname"]
};

const EMPTY_STORE: ImportedDataStore = { version: 1, meets: [] };

const normalizeHeader = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      row.push(field);
      if (row.length > 1 || row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.length > 1 || row.some((value) => value.trim() !== "")) {
    rows.push(row);
  }

  return rows;
};

const mapHeaders = (headers: string[]): CsvFieldMap => {
  const normalized = headers.map(normalizeHeader);
  const findIndex = (keys: string[]) =>
    normalized.findIndex((header) => keys.includes(header));

  return {
    event: findIndex(HEADER_SYNONYMS.event),
    result: findIndex(HEADER_SYNONYMS.result),
    first: findIndex(HEADER_SYNONYMS.first),
    last: findIndex(HEADER_SYNONYMS.last),
    name: findIndex(HEADER_SYNONYMS.name),
    gender: findIndex(HEADER_SYNONYMS.gender),
    grade: findIndex(HEADER_SYNONYMS.grade),
    team: findIndex(HEADER_SYNONYMS.team)
  };
};

const parseAthleteName = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return { first: "", last: "" };
  if (trimmed.includes(",")) {
    const [last, first] = trimmed.split(",").map((part) => part.trim());
    return { first: first ?? "", last: last ?? "" };
  }
  const parts = trimmed.split(/\s+/);
  return {
    first: parts.slice(0, -1).join(" "),
    last: parts.slice(-1).join(" ")
  };
};

const parseTimeValue = (value: string) => {
  const parts = value.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return null;
};

export const parseMark = (raw: string) => {
  const cleaned = raw.trim();
  if (!cleaned) {
    return { value: null, type: "unknown" as const };
  }

  if (cleaned.includes(":")) {
    const timeValue = parseTimeValue(cleaned);
    return { value: timeValue, type: "time" as const };
  }

  const numeric = Number(cleaned.replace(/[^0-9.]/g, ""));
  if (!Number.isNaN(numeric) && /[0-9]/.test(cleaned) && !cleaned.includes("-")) {
    return { value: numeric, type: "distance" as const };
  }

  const feetMatch = cleaned.match(/^(\d+)[-'](\d+(?:\.\d+)?)$/);
  if (feetMatch) {
    const feet = Number(feetMatch[1]);
    const inches = Number(feetMatch[2]);
    if (!Number.isNaN(feet) && !Number.isNaN(inches)) {
      const totalInches = feet * 12 + inches;
      return { value: totalInches * 0.0254, type: "distance" as const };
    }
  }

  return { value: null, type: "unknown" as const };
};

export const buildMeetFromCsv = (
  text: string,
  options: {
    name: string;
    date?: string;
    season?: string;
    location?: string;
    source?: string;
  }
) => {
  const rows = parseCsv(text);
  const warnings: string[] = [];

  if (!rows.length) {
    return { meet: null, warnings: ["No rows found in the CSV."], totalRows: 0 };
  }

  const [headerRow, ...dataRows] = rows;
  const mapping = mapHeaders(headerRow);
  const totalRows = dataRows.length;

  const performances: ImportedPerformance[] = [];

  dataRows.forEach((row, index) => {
    const eventName = row[mapping.event]?.trim() ?? "";
    const resultRaw = row[mapping.result]?.trim() ?? "";

    let first = row[mapping.first]?.trim() ?? "";
    let last = row[mapping.last]?.trim() ?? "";

    if ((!first || !last) && mapping.name >= 0) {
      const parsedName = parseAthleteName(row[mapping.name] ?? "");
      first = first || parsedName.first;
      last = last || parsedName.last;
    }

    if (!eventName || !resultRaw || !first || !last) {
      warnings.push(`Skipped row ${index + 2}: missing event, athlete, or result.`);
      return;
    }

    const { value, type } = parseMark(resultRaw);
    const athleteId = slugify(`${first}-${last}-${row[mapping.team] ?? ""}`);

    performances.push({
      athleteId,
      athleteFirst: first,
      athleteLast: last,
      eventName,
      markRaw: resultRaw,
      markValue: value,
      markType: type,
      gender: row[mapping.gender]?.trim() || undefined,
      grade: row[mapping.grade]?.trim() || undefined,
      team: row[mapping.team]?.trim() || undefined
    });
  });

  if (!performances.length) {
    warnings.push("No usable performances were found in the CSV.");
  }

  const meetIdBase = slugify(options.name || "imported-meet");
  const dateTag = options.date ? options.date.replace(/[^0-9]/g, "") : "undated";
  const meetId = `${meetIdBase}-${dateTag}-${Date.now().toString(36).slice(-4)}`;

  const meet: ImportedMeet = {
    id: meetId,
    name: options.name || "Imported Meet",
    date: options.date || undefined,
    location: options.location || undefined,
    season: options.season || undefined,
    source: options.source || undefined,
    importedAt: new Date().toISOString(),
    performances
  };

  return { meet, warnings, totalRows };
};

export const loadImportStore = (): ImportedDataStore => {
  if (typeof window === "undefined") return { ...EMPTY_STORE };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...EMPTY_STORE };
  try {
    const parsed = JSON.parse(raw) as ImportedDataStore;
    if (parsed?.version !== 1 || !Array.isArray(parsed.meets)) {
      return { ...EMPTY_STORE };
    }
    return parsed;
  } catch {
    return { ...EMPTY_STORE };
  }
};

export const saveImportStore = (store: ImportedDataStore) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const clearImportStore = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const getImportSummary = (store: ImportedDataStore) => {
  const performanceCount = store.meets.reduce(
    (total, meet) => total + meet.performances.length,
    0
  );
  const athletes = new Set(
    store.meets.flatMap((meet) => meet.performances.map((performance) => performance.athleteId))
  );
  return {
    meets: store.meets.length,
    performances: performanceCount,
    athletes: athletes.size
  };
};

export const getAthletesFromStore = (store: ImportedDataStore) => {
  const athleteMap = new Map<
    string,
    {
      id: string;
      first: string;
      last: string;
      gender?: string;
      grade?: string;
      team?: string;
      performances: Array<{
        meetName: string;
        meetDate?: string;
        eventName: string;
        markRaw: string;
        markValue: number | null;
        markType: "time" | "distance" | "unknown";
      }>;
    }
  >();

  store.meets.forEach((meet) => {
    meet.performances.forEach((performance) => {
      if (!athleteMap.has(performance.athleteId)) {
        athleteMap.set(performance.athleteId, {
          id: performance.athleteId,
          first: performance.athleteFirst,
          last: performance.athleteLast,
          gender: performance.gender,
          grade: performance.grade,
          team: performance.team,
          performances: []
        });
      }
      const athlete = athleteMap.get(performance.athleteId);
      athlete?.performances.push({
        meetName: meet.name,
        meetDate: meet.date,
        eventName: performance.eventName,
        markRaw: performance.markRaw,
        markValue: performance.markValue,
        markType: performance.markType
      });
    });
  });

  return Array.from(athleteMap.values()).sort((a, b) => a.last.localeCompare(b.last));
};

export const buildLeaderboards = (store: ImportedDataStore, limit = 5) => {
  const eventMap = new Map<
    string,
    {
      eventName: string;
      type: "time" | "distance" | "unknown";
      performances: Array<{
        athleteName: string;
        meetName: string;
        meetDate?: string;
        markRaw: string;
        markValue: number | null;
        markType: "time" | "distance" | "unknown";
      }>;
    }
  >();

  store.meets.forEach((meet) => {
    meet.performances.forEach((performance) => {
      if (!eventMap.has(performance.eventName)) {
        eventMap.set(performance.eventName, {
          eventName: performance.eventName,
          type: performance.markType,
          performances: []
        });
      }
      const eventEntry = eventMap.get(performance.eventName);
      eventEntry?.performances.push({
        athleteName: `${performance.athleteFirst} ${performance.athleteLast}`,
        meetName: meet.name,
        meetDate: meet.date,
        markRaw: performance.markRaw,
        markValue: performance.markValue,
        markType: performance.markType
      });
    });
  });

  return Array.from(eventMap.values()).map((event) => {
    const sorted = [...event.performances].filter((entry) => entry.markValue !== null);
    const sortDirection =
      event.type === "distance"
        ? (a: (typeof sorted)[number], b: (typeof sorted)[number]) =>
            (b.markValue ?? 0) - (a.markValue ?? 0)
        : (a: (typeof sorted)[number], b: (typeof sorted)[number]) =>
            (a.markValue ?? 0) - (b.markValue ?? 0);
    sorted.sort(sortDirection);
    return {
      ...event,
      performances: sorted.slice(0, limit)
    };
  });
};

export const formatImportedMark = (
  markRaw: string,
  markValue: number | null,
  markType: "time" | "distance" | "unknown"
) => {
  if (markRaw) return markRaw;
  if (markValue === null) return "—";
  if (markType === "time") {
    const minutes = Math.floor(markValue / 60);
    const seconds = markValue - minutes * 60;
    if (minutes > 0) {
      return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
    }
    return seconds.toFixed(2);
  }
  return `${markValue.toFixed(2)} m`;
};
