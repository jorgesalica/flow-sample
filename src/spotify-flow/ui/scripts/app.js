const OUTPUT_ROOT = new URL("../../../../outputs/spotify/", import.meta.url);
const SAMPLE_DEFINITIONS = {
  compact: {
    url: new URL("my_liked_songs.json", OUTPUT_ROOT).href,
    label: "my_liked_songs.json",
  },
  enriched: {
    url: new URL("enriched_likes.json", OUTPUT_ROOT).href,
    label: "enriched_likes.json",
  },
  "compact-enriched": {
    url: new URL("enriched_likes.compact.json", OUTPUT_ROOT).href,
    label: "enriched_likes.compact.json",
  },
};

const SAMPLE_CANDIDATES = [
  { key: "enriched", ...SAMPLE_DEFINITIONS.enriched },
  { key: "compact", ...SAMPLE_DEFINITIONS.compact },
  { key: "compact-enriched", ...SAMPLE_DEFINITIONS["compact-enriched"] },
];

const API_BASE = "/api/spotify";
const FALLBACK_SERVER_ORIGIN = "http://127.0.0.1:4173";
const CLI_COMMAND = "npm start -- --export-and-enrich";
const EMPTY_GLYPH = "\u2014";

const state = {
  tracks: [],
  metrics: {
    totalTracks: 0,
    uniqueArtists: 0,
    topGenre: EMPTY_GLYPH,
  },
  sourceLabel: "None",
  statusMessage: "Ready to explore.",
  statusTone: "info",
  isRunningFlow: false,
  currentSource: null, // 'auto' | 'compact' | 'enriched' | 'compact-enriched'
  currentFilter: 'all', // 'all' | 'this_month' | 'last_month' | 'this_year' | 'last_year'
};

const elements = {
  sampleSelect: document.getElementById("sample-select"),
  sourceLabel: document.getElementById("source-label"),
  metricTotal: document.getElementById("metric-total"),
  metricArtists: document.getElementById("metric-artists"),
  metricGenre: document.getElementById("metric-genre"),
  trackGrid: document.getElementById("track-grid"),
  emptyState: document.getElementById("empty-state"),
  statusBanner: document.getElementById("status-banner"),
  autoLoadButton: document.getElementById("btn-auto-load"),
  runFlowButton: document.getElementById("btn-run-flow"),
  cliHintButton: document.getElementById("btn-cli-hint"),
  timeFilter: document.getElementById("time-filter"),
};

function logDebug(message, payload) {
  console.log(`[spotify-flow-ui] ${message}`, payload ?? "");
}

function updateState(partial) {
  Object.assign(state, partial);
  renderApp();
}

function renderApp() {
  renderMetrics();
  renderGrid();
  renderStatus();
}

function renderStatus() {
  if (!elements.statusBanner) return;
  elements.statusBanner.textContent = state.statusMessage || "";
  elements.statusBanner.dataset.tone = state.statusTone || "info";
  elements.statusBanner.hidden = !state.statusMessage;
}

function setStatus(message, tone = "info") {
  logDebug(`Status -> ${tone}`, message);
  state.statusMessage = message;
  state.statusTone = tone;
  renderStatus();
}

function setRunButtonState(isRunning) {
  state.isRunningFlow = isRunning;
  if (!elements.runFlowButton) return;
  const defaultLabel = elements.runFlowButton.dataset.label ?? "Run export + enrich";
  elements.runFlowButton.disabled = isRunning;
  elements.runFlowButton.textContent = isRunning ? "Running..." : defaultLabel;
}

function normalizeOrigin(origin) {
  if (!origin) return "";
  return origin.replace(/\/+$/u, "");
}

function buildApiBase(origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  const base = normalizedOrigin || window.location.origin;
  return normalizeOrigin(new URL(API_BASE, base).href);
}

async function sendFlowRequest(origin, payload) {
  const apiBase = buildApiBase(origin);
  logDebug("Flow API request", { origin: normalizeOrigin(origin), apiBase });
  const response = await fetch(apiBase + "/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    logDebug("Failed to parse flow response JSON", { apiBase, error });
  }

  return { origin: normalizeOrigin(origin), apiBase, response, data };
}

function hydrateTracks(raw) {
  logDebug("Hydrating raw data", raw);
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((entry) => entry && (entry.track_id || entry.id))
    .map((entry, index) => {
      const id = entry.track_id || entry.id || `track-${index}`;
      const title = entry.track_name || entry.name || "Untitled";

      const artists = deriveArtists(entry);
      const album = deriveAlbum(entry);
      const addedAt = entry.added_at || entry.saved_at || null;
      const releaseInfo = deriveRelease(entry, album);
      const genres = deriveGenres(entry);
      const era = deriveEra(releaseInfo.year || addedAt);

      return {
        id,
        title,
        artists,
        artistLine: artists.length > 0 ? artists.join(", ") : "Unknown artist",
        album: album?.name ?? "",
        releaseYear: releaseInfo.year,
        releaseLabel: releaseInfo.label,
        addedAt,
        era,
        genres,
        popularity: typeof entry.popularity === "number" ? entry.popularity : null,
      };
    });
}

function deriveArtists(entry) {
  if (Array.isArray(entry.artists)) {
    return entry.artists
      .map((artist) => {
        if (!artist) return null;
        if (typeof artist === "string") return artist.trim();
        return artist.name?.trim() || null;
      })
      .filter(Boolean);
  }

  if (Array.isArray(entry.artistas_enriquecidos)) {
    return entry.artistas_enriquecidos
      .map((artist) => artist?.name || artist?.nombre)
      .filter(Boolean)
      .map((name) => name.trim());
  }

  if (typeof entry.artists_joined === "string") {
    return entry.artists_joined.split(/[,;]/).map((name) => name.trim()).filter(Boolean);
  }

  if (typeof entry.artist === "string") {
    return [entry.artist.trim()];
  }

  if (typeof entry.artist_name === "string") {
    return [entry.artist_name.trim()];
  }

  return [];
}

function deriveAlbum(entry) {
  if (entry.album && typeof entry.album === "object") {
    return {
      name: entry.album.name || entry.album.album_name || "",
      releaseDate: entry.album.release_date || entry.album.releaseDate || null,
    };
  }

  if (typeof entry.album_name === "string") {
    return {
      name: entry.album_name,
      releaseDate: entry.album_release_date || null,
    };
  }

  return null;
}

function deriveRelease(entry, album) {
  const yearCandidate = entry.year || entry.release_year;
  const releaseDate = album?.releaseDate || entry.release_date || entry.first_release_date;

  const yearFromDate = extractYear(releaseDate);
  const year = extractYear(yearCandidate) || yearFromDate;

  return {
    year,
    label: releaseDate || year || null,
  };
}

function extractYear(value) {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.abs(value) >= 1000 ? Math.trunc(value) : null;
  }

  if (typeof value === "string") {
    const match = value.match(/\d{4}/);
    return match ? Number(match[0]) : null;
  }

  return null;
}

function deriveEra(value) {
  const year = extractYear(value);
  if (!year) return "Unknown era";

  if (year >= new Date().getFullYear() - 2) {
    return "Fresh wave";
  }

  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

function deriveGenres(entry) {
  const genres = new Set();

  if (Array.isArray(entry.artist_genres)) {
    entry.artist_genres.forEach((genre) => {
      if (typeof genre === "string" && genre.trim()) genres.add(genre.trim());
    });
  }

  if (typeof entry.artist_genres_joined === "string") {
    entry.artist_genres_joined
      .split(/[,;]/)
      .map((genre) => genre.trim())
      .filter(Boolean)
      .forEach((genre) => genres.add(genre));
  }

  if (Array.isArray(entry.genres)) {
    entry.genres
      .map((genre) => (typeof genre === "string" ? genre.trim() : null))
      .filter(Boolean)
      .forEach((genre) => genres.add(genre));
  }

  if (Array.isArray(entry.artistas_enriquecidos)) {
    entry.artistas_enriquecidos.forEach((artist) => {
      if (Array.isArray(artist?.genres)) {
        artist.genres
          .map((genre) => (typeof genre === "string" ? genre.trim() : null))
          .filter(Boolean)
          .forEach((genre) => genres.add(genre));
      }
    });
  }

  return Array.from(genres);
}

function calculateMetrics(tracks) {
  const total = tracks.length;
  const artistSet = new Set();
  const genreCounts = new Map();

  tracks.forEach((track) => {
    track.artists.forEach((artist) => artistSet.add(artist));
    track.genres.forEach((genre) => {
      const nextCount = (genreCounts.get(genre) || 0) + 1;
      genreCounts.set(genre, nextCount);
    });
  });

  let topGenre = EMPTY_GLYPH;
  if (genreCounts.size > 0) {
    const [genre] = Array.from(genreCounts.entries()).sort((a, b) => {
      if (b[1] === a[1]) return a[0].localeCompare(b[0]);
      return b[1] - a[1];
    })[0];
    topGenre = capitalize(genre);
  }

  return {
    totalTracks: total,
    uniqueArtists: artistSet.size,
    topGenre,
  };
}

function capitalize(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderMetrics() {
  const totalEl = elements.metricTotal;
  const artistsEl = elements.metricArtists;
  const genreEl = elements.metricGenre;

  const filteredTracks = filterTracks(state.tracks, state.currentFilter);

  // 1. Total tracks
  totalEl.textContent = filteredTracks.length;
  if (state.tracks.length > 0 && filteredTracks.length !== state.tracks.length) {
    totalEl.textContent += ` (of ${state.tracks.length})`;
    totalEl.style.fontSize = "1.8rem"; // Slightly smaller to fit
  } else {
    totalEl.style.fontSize = "";
  }

  // 2. Unique artists
  const uniqueArtists = new Set();
  filteredTracks.forEach((t) => {
    t.artists.forEach((artist) => uniqueArtists.add(artist));
  });
  artistsEl.textContent = uniqueArtists.size;

  // 3. Top genre
  const genreCounts = {};
  filteredTracks.forEach((t) => {
    t.genres.forEach((genre) => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
  });

  let topGenre = EMPTY_GLYPH;
  if (Object.keys(genreCounts).length > 0) {
    const sortedGenres = Object.entries(genreCounts).sort((a, b) => {
      if (b[1] === a[1]) return a[0].localeCompare(b[0]);
      return b[1] - a[1];
    });
    topGenre = capitalize(sortedGenres[0][0]);
  }
  genreEl.textContent = topGenre;

  elements.sourceLabel.textContent = state.sourceLabel;
}

function renderGrid() {
  const grid = elements.trackGrid;
  const emptyState = elements.emptyState;

  grid.innerHTML = "";

  const filteredTracks = filterTracks(state.tracks, state.currentFilter);

  if (filteredTracks.length === 0) {
    emptyState.hidden = false;
    if (state.tracks.length > 0) {
      emptyState.querySelector("p").textContent = "No tracks match the selected filter.";
    } else {
      emptyState.querySelector("p").textContent = "No tracks loaded yet. Let the flow begin.";
    }
    return;
  }

  emptyState.hidden = true;
  const fragment = document.createDocumentFragment();

  filteredTracks.forEach((track) => {
    const card = document.createElement("article");
    card.className = "track-card";
    card.setAttribute("role", "listitem");

    const title = document.createElement("h3");
    title.className = "track-title";
    title.textContent = track.title;
    card.appendChild(title);

    const artistLine = document.createElement("p");
    artistLine.className = "track-meta";
    artistLine.textContent = track.artistLine;
    card.appendChild(artistLine);

    const albumMeta = document.createElement("p");
    albumMeta.className = "track-meta";
    const albumPieces = [];
    if (track.album) albumPieces.push(track.album);
    if (track.releaseYear) albumPieces.push(track.releaseYear);
    albumMeta.textContent = albumPieces.join(" • ");
    card.appendChild(albumMeta);

    const tagRow = document.createElement("div");
    tagRow.className = "track-tags";

    if (track.era) {
      const eraTag = document.createElement("span");
      eraTag.className = "track-tag";
      eraTag.textContent = track.era;
      tagRow.appendChild(eraTag);
    }

    if (track.genres.length > 0) {
      const firstGenre = track.genres[0];
      const genreTag = document.createElement("span");
      genreTag.className = "track-tag";
      genreTag.textContent = capitalize(firstGenre);
      tagRow.appendChild(genreTag);
    }

    if (typeof track.popularity === "number") {
      const popularityTag = document.createElement("span");
      popularityTag.className = "track-tag";
      popularityTag.textContent = `Popularity ${track.popularity}`;
      tagRow.appendChild(popularityTag);
    }

    if (track.addedAt) {
      const addedTag = document.createElement("span");
      addedTag.className = "track-tag";
      addedTag.textContent = `Added ${formatAddedAt(track.addedAt)}`;
      tagRow.appendChild(addedTag);
    }

    if (tagRow.children.length > 0) {
      card.appendChild(tagRow);
    }

    fragment.appendChild(card);
  });

  elements.trackGrid.innerHTML = "";
  elements.trackGrid.appendChild(fragment);
}

function formatAddedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const year = extractYear(value);
    return year ? String(year) : String(value);
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  });
}

function handleHydratedData(tracks, sourceLabel, options = {}) {
  const { announce = true } = options;
  logDebug(`Handling hydrated data from ${sourceLabel}`, { count: tracks.length });

  // Calculate metrics for state (so status message is correct)
  const metrics = calculateMetrics(tracks);
  updateState({ tracks, metrics, sourceLabel, currentSource: options.key || null });

  if (!announce) return;

  if (tracks.length > 0) {
    setStatus(`Loaded ${tracks.length} tracks from ${sourceLabel}.`, "success");
  } else {
    setStatus(`Loaded ${sourceLabel}, but it did not contain any tracks.`, "warning");
  }
}

async function fetchTracks(url) {
  logDebug("Fetching", url);
  const response = await fetch(url, { cache: "no-store" });
  logDebug("Response", { status: response.status, ok: response.ok });
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (status ${response.status}).`);
  }
  const data = await response.json();
  return hydrateTracks(data);
}

async function loadFromDefinition(definition, { announce = true, key = null } = {}) {
  logDebug("Loading definition", definition);
  const tracks = await fetchTracks(definition.url);
  handleHydratedData(tracks, definition.label || definition.url.replace(/^.*\//, ""), { announce, key });
  return tracks;
}

async function loadSampleByKey(key, options = {}) {
  logDebug("loadSampleByKey", key);
  const definition = SAMPLE_DEFINITIONS[key];
  if (!definition) {
    throw new Error(`Unknown sample key: ${key}`);
  }
  const tracks = await loadFromDefinition(definition, { ...options, key });
  elements.sampleSelect.value = key;
  return tracks;
}

async function attemptAutoLoad({ announce = true } = {}) {
  logDebug("attemptAutoLoad", SAMPLE_CANDIDATES);
  for (const candidate of SAMPLE_CANDIDATES) {
    try {
      const tracks = await loadFromDefinition(candidate, { announce: false, key: candidate.key });
      if (announce) {
        setStatus(`Loaded ${tracks.length} tracks from ${candidate.label}.`, "success");
      }
      elements.sampleSelect.value = candidate.key;
      return tracks;
    } catch (error) {
      logDebug(`Auto load failed for ${candidate.label}`, error);
      // Continue to next candidate
    }
  }

  const warning = `No export found in outputs/spotify/. Run \"${CLI_COMMAND}\" to generate one.`;
  setStatus(warning, "warning");
  elements.sampleSelect.value = "";
  return [];
}

async function showCliHint() {
  const hint = `Run \"${CLI_COMMAND}\" to refresh the exports in outputs/spotify/.`;
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(CLI_COMMAND);
      setStatus(`${hint} Command copied to clipboard.`, "success");
      return;
    } catch (error) {
      console.warn(error);
    }
  }
  setStatus(hint, "info");
}

async function runFlowViaApi() {
  if (state.isRunningFlow) return;

  const payload = {
    actions: {
      export: true,
      enrich: true,
      compact: true,
    },
  };

  logDebug("Triggering flow via API", payload);
  setStatus("Running export + enrich via local server...", "info");
  setRunButtonState(true);

  const candidateOrigins = [];
  if (
    window.location.origin &&
    window.location.origin !== "null" &&
    !window.location.origin.startsWith("file:")
  ) {
    candidateOrigins.push(window.location.origin);
  }
  candidateOrigins.push(FALLBACK_SERVER_ORIGIN);

  const uniqueOrigins = Array.from(new Set(candidateOrigins.map(normalizeOrigin))).filter(Boolean);
  const attempts = [];

  try {
    for (const origin of uniqueOrigins) {
      try {
        const attempt = await sendFlowRequest(origin, payload);
        const { apiBase, response, data } = attempt;
        logDebug("Flow API response", { apiBase, status: response.status, ok: response.ok, data });

        if (response.ok && data?.success) {
          const executed = data.result?.executed ?? {};
          const summaryPieces = [
            executed.export ? "exported" : null,
            executed.enrich ? "enriched" : null,
            executed.compact ? "compacted" : null,
          ].filter(Boolean);
          const summary =
            summaryPieces.length > 0 ? summaryPieces.join(" + ") : "no actions completed";

          setStatus(
            "Flow completed via " + apiBase + " (" + summary + "). Reloading latest export...",
            "success",
          );

          await attemptAutoLoad({ announce: false });

          setStatus(
            "Flow completed via " +
            apiBase +
            ". Loaded " +
            state.metrics.totalTracks +
            " tracks from " +
            state.sourceLabel +
            ".",
            "success",
          );

          console.groupCollapsed("[spotify-flow-ui] Flow run details");
          console.log("API base", apiBase);
          console.log("Result", data.result);
          console.log("Logs", data.result?.logs ?? data.logs);
          console.log("Steps", data.result?.steps ?? data.steps);
          console.groupEnd();
          return;
        }

        const message =
          (data && data.error) ||
          (response.status === 404
            ? "Flow endpoint not found on this origin."
            : "Request failed with status " + response.status + ".");

        attempts.push({ apiBase, response, data, message });
      } catch (error) {
        const normalizedOrigin = normalizeOrigin(origin);
        attempts.push({
          origin: normalizedOrigin,
          apiBase: buildApiBase(origin),
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    const detailMessage = attempts
      .map((attempt) => {
        if (attempt.response) {
          const reason =
            attempt.message ||
            (attempt.data && attempt.data.error) ||
            "status " + attempt.response.status;
          return attempt.apiBase + ": " + reason;
        }
        const errorMessage =
          attempt.error && attempt.error.message ? attempt.error.message : "unknown error";
        return attempt.apiBase + ": " + errorMessage;
      })
      .join("; ");

    throw new Error(
      detailMessage
        ? "Flow run failed across all known origins (" + detailMessage + ")."
        : "Flow run failed: no Spotify flow server reachable.",
    );
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    setStatus("Flow run failed: " + message, "error");
  } finally {
    setRunButtonState(false);
  }
}

function wireEvents() {
  elements.sampleSelect.addEventListener("change", (event) => {
    const { value } = event.target;
    logDebug("sampleSelect change", value);
    if (!value) return;

    if (value === "auto") {
      attemptAutoLoad();
      return;
    }

    loadSampleByKey(value).catch((error) => {
      console.error(error);
      const definition = SAMPLE_DEFINITIONS[value];
      const label = definition?.label || value;
      setStatus(`Could not load ${label}. Check the console for details.`, "error");
      event.target.value = "";
    });
  });

  if (elements.autoLoadButton) {
    elements.autoLoadButton.addEventListener("click", () => {
      logDebug("Auto-load button clicked");
      attemptAutoLoad();
    });
  }

  if (elements.runFlowButton) {
    elements.runFlowButton.addEventListener("click", () => {
      logDebug("Run flow button clicked");
      runFlowViaApi();
    });
  }

  if (elements.cliHintButton) {
    elements.cliHintButton.addEventListener("click", () => {
      logDebug("CLI hint button clicked");
      showCliHint();
    });
  }
}

function init() {
  logDebug("Initializing UI", { location: window.location.href });
  wireEvents();
  renderMetrics();
  renderGrid();
  renderStatus();
  setRunButtonState(false);
  window.spotifyFlowState = state;

  if (window.location.protocol === "file:") {
    const message =
      "Serve this UI from a local server (e.g., `npx serve .`) so the browser can fetch exports from outputs/spotify/.";
    setStatus(message, "warning");
  } else {
    attemptAutoLoad({ announce: false }).catch((error) => {
      logDebug("Auto-load on init failed", error);
    });
  }
}

init();





function filterTracks(tracks, filter) {
  if (filter === 'all') return tracks;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  return tracks.filter(track => {
    if (!track.added_at) return false;
    const date = new Date(track.added_at);
    const year = date.getFullYear();
    const month = date.getMonth();

    switch (filter) {
      case 'this_month':
        return year === currentYear && month === currentMonth;
      case 'last_month':
        // Handle January edge case
        if (currentMonth === 0) {
          return year === currentYear - 1 && month === 11;
        }
        return year === currentYear && month === currentMonth - 1;
      case 'this_year':
        return year === currentYear;
      case 'last_year':
        return year === currentYear - 1;
      default:
        return true;
    }
  });
}
