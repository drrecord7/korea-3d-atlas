/**
 * KOREA 3D SKY ATLAS — Spatial 3D Aerial Skyview + Live 360° Street Roadview
 * 17 Administrative Regions × 100 Verified Landmarks (1,700 Total)
 * 13 Languages · Zero External App Dependencies
 */
(function () {
  "use strict";

  const REGION_ORDER = [
    "seoul", "busan", "jeju", "gangwon", "gyeonggi",
    "incheon", "gyeongbuk", "gyeongnam", "jeonnam", "jeonbuk",
    "chungnam", "chungbuk", "daegu", "daejeon", "gwangju",
    "ulsan", "sejong"
  ];

  // Tuned visual hub coordinates, pixel offsets & 3D camera presets for all 17 regions
  const REGION_META = {
    seoul:     { code: "11", ko: "서울", fullKo: "서울특별시", en: "Seoul",     lat: 37.5665, lng: 126.9780, zoom: 12.0, hubOffset: [8, -22] },
    busan:     { code: "21", ko: "부산", fullKo: "부산광역시", en: "Busan",     lat: 35.1650, lng: 129.1100, zoom: 11.8, hubOffset: [18, 16] },
    daegu:     { code: "22", ko: "대구", fullKo: "대구광역시", en: "Daegu",     lat: 35.8550, lng: 128.5800, zoom: 11.6, hubOffset: [0, 4] },
    incheon:   { code: "23", ko: "인천", fullKo: "인천광역시", en: "Incheon",   lat: 37.4563, lng: 126.6250, zoom: 11.2, hubOffset: [-48, -4] },
    gwangju:   { code: "24", ko: "광주", fullKo: "광주광역시", en: "Gwangju",   lat: 35.1595, lng: 126.8526, zoom: 11.8, hubOffset: [-18, -10] },
    daejeon:   { code: "25", ko: "대전", fullKo: "대전광역시", en: "Daejeon",   lat: 36.3504, lng: 127.3845, zoom: 11.8, hubOffset: [22, 14] },
    ulsan:     { code: "26", ko: "울산", fullKo: "울산광역시", en: "Ulsan",     lat: 35.5384, lng: 129.3114, zoom: 11.5, hubOffset: [26, -6] },
    sejong:    { code: "29", ko: "세종", fullKo: "세종특별자치시", en: "Sejong", lat: 36.5400, lng: 127.2600, zoom: 11.8, hubOffset: [-4, -14] },
    gyeonggi:  { code: "31", ko: "경기", fullKo: "경기도",     en: "Gyeonggi",  lat: 37.2400, lng: 127.3200, zoom: 9.6,  hubOffset: [4, -4] },
    gangwon:   { code: "32", ko: "강원", fullKo: "강원특별자치도", en: "Gangwon", lat: 37.7500, lng: 128.4200, zoom: 9.2,  hubOffset: [10, -8] },
    chungbuk:  { code: "33", ko: "충북", fullKo: "충청북도",   en: "Chungbuk",  lat: 36.8800, lng: 127.7800, zoom: 9.6,  hubOffset: [16, -12] },
    chungnam:  { code: "34", ko: "충남", fullKo: "충청남도",   en: "Chungnam",  lat: 36.5500, lng: 126.6500, zoom: 9.6,  hubOffset: [-68, 10] },
    jeonbuk:   { code: "35", ko: "전북", fullKo: "전북특별자치도", en: "Jeonbuk", lat: 35.7600, lng: 127.1400, zoom: 9.7,  hubOffset: [-10, 0] },
    jeonnam:   { code: "36", ko: "전남", fullKo: "전라남도",   en: "Jeonnam",   lat: 34.7800, lng: 126.9800, zoom: 9.4,  hubOffset: [6, 18] },
    gyeongbuk: { code: "37", ko: "경북", fullKo: "경상북도",   en: "Gyeongbuk", lat: 36.3800, lng: 128.8800, zoom: 9.2,  hubOffset: [32, 8] },
    gyeongnam: { code: "38", ko: "경남", fullKo: "경상남도",   en: "Gyeongnam", lat: 35.2800, lng: 128.1800, zoom: 9.5,  hubOffset: [-16, 8] },
    jeju:      { code: "39", ko: "제주", fullKo: "제주특별자치도", en: "Jeju",    lat: 33.3850, lng: 126.5500, zoom: 10.5, hubOffset: [0, 0] }
  };

  const CODE_TO_REGION = {};
  Object.keys(REGION_META).forEach((k) => {
    CODE_TO_REGION[REGION_META[k].code] = k;
  });

  const CATEGORY_META = {
    heritage: { ko: "역사·유산", en: "Heritage" },
    nature:   { ko: "자연·산악", en: "Nature & Peaks" },
    coastal:  { ko: "해변·섬",   en: "Coast & Island" },
    culture:  { ko: "문화·예술", en: "Art & Culture" },
    market:   { ko: "시장·거리", en: "Local Market" },
    city:     { ko: "도심·전망", en: "Skyline" }
  };

  const state = {
    lang: "ko",
    activeRegion: "all",
    activeCategory: "all",
    searchQuery: "",
    mapStyle: "skyview-pure",
    is3DPitch: true,
    expandAllPins: false,
    activeSpot: null,
    rvData: null,
    markers: []
  };

  let map = null;

  // =========================================================
  // HELPERS & MULTILINGUAL RESOLVERS
  // =========================================================
  function getSpotDisplayName(spot, lang) {
    if (lang === "ko") return spot.ko;
    if (lang === "ja") return spot.ja || spot.en || spot.ko;
    if (lang === "zh-CN" || lang === "zh-TW") return spot.zh || spot.en || spot.ko;
    return spot.en || spot.ko;
  }

  function getSpotSubName(spot, lang) {
    if (lang === "ko") return spot.en || "";
    return spot.ko;
  }

  function getRegionDisplayName(regionKey, lang) {
    const i18nReg = window.KOREA_I18N?.regions?.[regionKey]?.names;
    if (i18nReg && i18nReg[lang]) return i18nReg[lang];
    return lang === "ko" ? REGION_META[regionKey].fullKo : REGION_META[regionKey].en;
  }

  function getRegionVibe(regionKey, lang) {
    const vibes = window.KOREA_I18N?.regions?.[regionKey]?.vibe;
    if (!vibes) return "";
    return vibes[lang] || vibes["en"] || vibes["ko"] || "";
  }

  function getUIString(key, fallback) {
    const table = window.KOREA_I18N?.ui?.[state.lang] || window.KOREA_I18N?.ui?.["en"];
    return (table && table[key]) || fallback;
  }

  function getAllSpotsFlat() {
    const raw = window.KOREA_SPOTS_1700 || {};
    const list = [];
    REGION_ORDER.forEach((rKey) => {
      const arr = raw[rKey] || [];
      arr.forEach((s) => {
        list.push({ ...s, region: rKey });
      });
    });
    return list;
  }

  const ALL_SPOTS = getAllSpotsFlat();

  // =========================================================
  // REAL 3D SKYVIEW AERIAL MAP STYLE ENGINE
  // =========================================================
  function buildSkyviewStyle(mode, lang) {
    const hl = encodeURIComponent(lang || "en");

    const sources = {
      skyview_pure: {
        type: "raster",
        tiles: [
          "https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
          "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
          "https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
          "https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
        ],
        tileSize: 256,
        maxzoom: 20,
        attribution: "3D Skyview Imagery"
      },
      skyview_hybrid: {
        type: "raster",
        tiles: [
          `https://mt0.google.com/vt/lyrs=y&hl=${hl}&x={x}&y={y}&z={z}`,
          `https://mt1.google.com/vt/lyrs=y&hl=${hl}&x={x}&y={y}&z={z}`,
          `https://mt2.google.com/vt/lyrs=y&hl=${hl}&x={x}&y={y}&z={z}`,
          `https://mt3.google.com/vt/lyrs=y&hl=${hl}&x={x}&y={y}&z={z}`
        ],
        tileSize: 256,
        maxzoom: 20
      }
    };

    const layers = [
      {
        id: "skyview-pure-layer",
        type: "raster",
        source: "skyview_pure",
        paint: {
          "raster-contrast": 0.08,
          "raster-saturation": 0.06
        }
      }
    ];

    if (mode !== "skyview-pure") {
      layers.push({
        id: "skyview-hybrid-detail-layer",
        type: "raster",
        source: "skyview_hybrid",
        minzoom: 10.2,
        paint: {
          "raster-contrast": 0.06,
          "raster-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10.2, 0,
            11.2, 1
          ]
        }
      });
    }

    return {
      version: 8,
      sky: {
        "sky-color": "#040814",
        "sky-horizon-blend": 0.55,
        "horizon-color": "#162d4c",
        "horizon-fog-blend": 0.65,
        "fog-color": "#091326",
        "fog-ground-blend": 0.35
      },
      sources,
      layers
    };
  }

  function getMapPadding() {
    if (window.innerWidth <= 900) {
      return { top: 64, bottom: Math.round(window.innerHeight * 0.44), left: 12, right: 12 };
    }
    return { top: 72, bottom: 28, left: 404, right: 24 };
  }

  // =========================================================
  // INITIALIZE 3D MAPLIBRE GL JS
  // =========================================================
  function initMap() {
    if (window.KOREA_GEO_3D && window.KOREA_GEO_3D.features) {
      window.KOREA_GEO_3D.features.forEach((f) => {
        const code = String(f.properties?.code || "");
        f.properties.regionKey = CODE_TO_REGION[code] || "seoul";
      });
    }

    map = new maplibregl.Map({
      container: "map",
      style: buildSkyviewStyle(state.mapStyle, state.lang),
      center: [127.75, 35.88],
      zoom: 6.6,
      pitch: 56,
      bearing: -3,
      maxPitch: 78,
      antialias: true
    });

    map.setPadding(getMapPadding());
    window.addEventListener("resize", () => {
      if (map) map.setPadding(getMapPadding());
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");

    map.on("style.load", () => {
      addTerrainAndProvinceLayers();
      renderMapMarkers();
    });

    map.on("moveend", () => {
      renderMapMarkers();
    });
  }

  function addTerrainAndProvinceLayers() {
    if (!map) return;

    // 1. Global 3D Terrain Elevation (AWS Terrarium DEM)
    if (!map.getSource("terrain-dem")) {
      try {
        map.addSource("terrain-dem", {
          type: "raster-dem",
          tiles: [
            "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
          ],
          encoding: "terrarium",
          tileSize: 256,
          maxzoom: 14
        });
        map.setTerrain({ source: "terrain-dem", exaggeration: 1.5 });
      } catch (e) {
        // Ignore if terrain tiles fail
      }
    }

    // 2. Precision Spatial Cyan Province Boundaries over Aerial Skyview
    if (window.KOREA_GEO_3D && !map.getSource("korea-provinces")) {
      map.addSource("korea-provinces", {
        type: "geojson",
        data: window.KOREA_GEO_3D
      });

      map.addLayer({
        id: "provinces-fill",
        type: "fill",
        source: "korea-provinces",
        paint: {
          "fill-color": "#38bdf8",
          "fill-opacity": [
            "case",
            ["==", ["get", "regionKey"], state.activeRegion],
            0.09,
            0.01
          ]
        }
      });

      map.addLayer({
        id: "provinces-border-glow",
        type: "line",
        source: "korea-provinces",
        paint: {
          "line-color": "#040814",
          "line-width": 3.2,
          "line-opacity": 0.55
        }
      });

      map.addLayer({
        id: "provinces-border",
        type: "line",
        source: "korea-provinces",
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "regionKey"], state.activeRegion],
            "#38bdf8",
            "rgba(224, 242, 254, 0.52)"
          ],
          "line-width": [
            "case",
            ["==", ["get", "regionKey"], state.activeRegion],
            2.6,
            1.1
          ],
          "line-opacity": 0.9
        }
      });

      map.on("click", "provinces-fill", (e) => {
        if (e.originalEvent && e.originalEvent.defaultPrevented) return;
        const feat = e.features && e.features[0];
        if (!feat) return;
        const rKey = feat.properties.regionKey;
        if (rKey && state.activeRegion === "all") {
          selectRegion(rKey, true);
        }
      });
    }
  }

  function updateProvinceHighlightLayers() {
    if (!map || !map.getLayer("provinces-fill")) return;
    map.setPaintProperty("provinces-fill", "fill-opacity", [
      "case",
      ["==", ["get", "regionKey"], state.activeRegion],
      0.09,
      0.01
    ]);
    map.setPaintProperty("provinces-border", "line-color", [
      "case",
      ["==", ["get", "regionKey"], state.activeRegion],
      "#38bdf8",
      "rgba(224, 242, 254, 0.52)"
    ]);
    map.setPaintProperty("provinces-border", "line-width", [
      "case",
      ["==", ["get", "regionKey"], state.activeRegion],
      2.6,
      1.1
    ]);
  }

  // =========================================================
  // SPATIAL GLASS MARKER ENGINE (ZERO OVERLAP, ZERO EMOJIS)
  // =========================================================
  function clearMarkers() {
    state.markers.forEach((m) => m.remove());
    state.markers = [];
  }

  function renderMapMarkers() {
    if (!map) return;
    clearMarkers();

    const zoom = map.getZoom();

    // CASE 1: National Peninsula Overview (17 Obsidian Glass Region Capsules)
    if (state.activeRegion === "all" && !state.searchQuery && zoom < 8.8) {
      REGION_ORDER.forEach((rKey) => {
        const meta = REGION_META[rKey];
        const wrap = document.createElement("div");
        wrap.className = "atlas-marker-wrap";

        const primaryName = state.lang === "ko" ? meta.ko : meta.en;
        const secondaryName = state.lang === "ko" ? meta.en : meta.ko;

        wrap.innerHTML = `
          <div class="region-hub-marker">
            <span class="region-hub-dot"></span>
            <div class="region-hub-names">
              <span class="region-hub-primary">${primaryName}</span>
              <span class="region-hub-secondary">${secondaryName}</span>
            </div>
            <span class="region-hub-count">100</span>
          </div>
        `;

        wrap.addEventListener("click", (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          selectRegion(rKey, true);
        });

        const marker = new maplibregl.Marker({
          element: wrap,
          anchor: "center",
          offset: meta.hubOffset || [0, 0]
        })
          .setLngLat([meta.lng, meta.lat])
          .addTo(map);

        state.markers.push(marker);
      });
      return;
    }

    // CASE 2: Regional Skyview or Zoomed-In View
    const spots = getFilteredSpots();
    const occupiedBoxes = [];
    const sortedSpots = [...spots].sort((a, b) => a.rank - b.rank);
    const maxRender = state.activeRegion === "all" && !state.searchQuery ? 150 : 100;
    const slice = sortedSpots.slice(0, maxRender);

    slice.forEach((spot) => {
      const pt = map.project([spot.lng, spot.lat]);
      let showFullCallout = state.expandAllPins || zoom >= 13.5;

      if (!showFullCallout) {
        const boxW = 152;
        const boxH = 38;
        const box = {
          x1: pt.x - boxW / 2,
          y1: pt.y - boxH,
          x2: pt.x + boxW / 2,
          y2: pt.y + 4
        };
        const collides = occupiedBoxes.some(
          (b) => !(box.x2 < b.x1 || box.x1 > b.x2 || box.y2 < b.y1 || box.y1 > b.y2)
        );
        if (!collides) {
          showFullCallout = true;
          occupiedBoxes.push(box);
        }
      }

      const displayName = getSpotDisplayName(spot, state.lang);
      const rankPad = String(spot.rank).padStart(2, "0");
      const wrap = document.createElement("div");
      wrap.className = "atlas-marker-wrap";

      if (showFullCallout) {
        const topCls = spot.rank <= 10 ? "is-top" : "";
        wrap.style.zIndex = String(200 - Math.min(spot.rank, 100));
        wrap.innerHTML = `
          <div class="spot-callout-pin ${topCls}">
            <div class="spot-callout-body">
              <span class="spot-pill-rank">${rankPad}</span>
              <span class="spot-pill-label">${displayName}</span>
            </div>
            <span class="spot-callout-stem"></span>
            <span class="spot-callout-dot"></span>
          </div>
        `;
      } else {
        wrap.style.zIndex = String(100 - Math.min(spot.rank, 99));
        wrap.innerHTML = `
          <div class="spot-marker-compact">
            <span>${spot.rank}</span>
            <div class="compact-hover-card">#${rankPad} ${displayName} · ${spot.ko}</div>
          </div>
        `;
      }

      wrap.addEventListener("click", (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        diveIntoSpotRoadview(spot);
      });

      const marker = new maplibregl.Marker({
        element: wrap,
        anchor: showFullCallout ? "bottom" : "center"
      })
        .setLngLat([spot.lng, spot.lat])
        .addTo(map);

      state.markers.push(marker);
    });
  }

  // =========================================================
  // SIDEBAR DOCK & MULTILINGUAL UI
  // =========================================================
  function getFilteredSpots() {
    const q = state.searchQuery.trim().toLowerCase();
    return ALL_SPOTS.filter((spot) => {
      if (state.activeRegion !== "all" && spot.region !== state.activeRegion) {
        return false;
      }
      if (state.activeCategory !== "all" && spot.cat !== state.activeCategory) {
        return false;
      }
      if (q) {
        const hay = `${spot.ko} ${spot.en || ""} ${spot.ja || ""} ${spot.zh || ""} ${spot.region}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }

  function syncLocalizedUIStrings() {
    const isKo = state.lang === "ko";
    document.getElementById("ui-app-title").textContent = isKo
      ? "대한민국 1,700대 명소 3D 스카이뷰"
      : getUIString("brandTitle", "Korea 3D Sky Atlas");

    document.getElementById("spot-search-input").placeholder = getUIString(
      "searchPlaceholder",
      "Search 1,700 landmarks, palaces, peaks, beaches..."
    );

    document.getElementById("cat-label-all").textContent = getUIString("catAll", "All");
    document.getElementById("cat-label-heritage").textContent = getUIString("catHeritage", "Heritage");
    document.getElementById("cat-label-nature").textContent = getUIString("catNature", "Nature");
    document.getElementById("cat-label-coastal").textContent = getUIString("catCoastal", "Coast");
    document.getElementById("cat-label-culture").textContent = getUIString("catCulture", "Culture");
    document.getElementById("cat-label-market").textContent = getUIString("catMarket", "Markets");

    document.getElementById("reset-label").textContent = isKo ? "전국 스카이뷰" : "All Korea";
    document.getElementById("rv-back-label").textContent = getUIString("backToMap", "Back to 3D Skyview");
  }

  function renderRegionTabs() {
    const strip = document.getElementById("region-strip");
    if (!strip) return;

    const allLabel = state.lang === "ko" ? "전국 17개 시도" : "All Korea (17)";
    let html = `
      <button type="button" class="region-tab-btn ${state.activeRegion === "all" ? "active" : ""}" data-region="all">
        <span>${allLabel}</span>
      </button>
    `;

    REGION_ORDER.forEach((rKey) => {
      const meta = REGION_META[rKey];
      const activeCls = state.activeRegion === rKey ? "active" : "";
      const label = state.lang === "ko" ? meta.ko : meta.en;
      html += `
        <button type="button" class="region-tab-btn ${activeCls}" data-region="${rKey}">
          <span>${label}</span>
        </button>
      `;
    });

    strip.innerHTML = html;

    strip.querySelectorAll(".region-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rKey = btn.getAttribute("data-region");
        selectRegion(rKey, true);
      });
    });
  }

  function selectRegion(regionKey, flyCamera = true) {
    state.activeRegion = regionKey;
    renderRegionTabs();
    updateRegionBanner();
    renderSpotList();
    updateProvinceHighlightLayers();

    if (flyCamera && map) {
      if (regionKey === "all") {
        map.flyTo({
          center: [127.75, 35.88],
          zoom: 6.6,
          pitch: state.is3DPitch ? 56 : 0,
          bearing: -3,
          duration: 1400,
          essential: true
        });
      } else {
        const meta = REGION_META[regionKey];
        map.flyTo({
          center: [meta.lng, meta.lat],
          zoom: meta.zoom,
          pitch: state.is3DPitch ? 60 : 0,
          bearing: 0,
          duration: 1500,
          essential: true
        });
      }
    } else {
      renderMapMarkers();
    }
  }

  function updateRegionBanner() {
    const badgeEl = document.getElementById("active-region-badge");
    const titleEl = document.getElementById("active-region-title");
    const descEl = document.getElementById("active-region-desc");
    const countEl = document.getElementById("active-spot-count");

    const spots = getFilteredSpots();
    if (countEl) countEl.textContent = spots.length.toLocaleString();

    if (state.activeRegion === "all") {
      badgeEl.textContent = "17 PROVINCES · 1,700";
      titleEl.textContent =
        state.lang === "ko"
          ? "전국 17개 시·도 1,700대 명소"
          : getUIString("allKorea", "All 17 Regions (1,700)");
      descEl.textContent = getUIString(
        "selectPrompt",
        "Select a province or landmark pin on the 3D Skyview to descend straight into a live 360° street-level Roadview."
      );
    } else {
      const meta = REGION_META[state.activeRegion];
      const dispName = getRegionDisplayName(state.activeRegion, state.lang);
      const vibe = getRegionVibe(state.activeRegion, state.lang);
      badgeEl.textContent = `${meta.en.toUpperCase()} · 100 SPOTS`;
      titleEl.textContent = dispName;
      descEl.textContent =
        vibe ||
        getUIString(
          "selectPrompt",
          "Tap any landmark below or on the 3D Skyview to descend into live 360° street-level Roadview."
        );
    }
  }

  function renderSpotList() {
    const listEl = document.getElementById("spot-list");
    if (!listEl) return;

    const spots = getFilteredSpots();
    const visible = spots.slice(0, 150);

    if (visible.length === 0) {
      listEl.innerHTML = `
        <div style="padding:32px 14px;text-align:center;color:#64748b;font-size:0.82rem;">
          No matching landmarks found.
        </div>
      `;
      return;
    }

    listEl.innerHTML = visible
      .map((spot) => {
        const catMeta = CATEGORY_META[spot.cat] || CATEGORY_META.heritage;
        const regMeta = REGION_META[spot.region];
        const mainName = getSpotDisplayName(spot, state.lang);
        const subName = getSpotSubName(spot, state.lang);
        const catName = state.lang === "ko" ? catMeta.ko : catMeta.en;
        const rankPad = String(spot.rank).padStart(2, "0");
        const topCls = spot.rank <= 10 ? "top-rank" : "";

        return `
          <article class="spot-card" data-spot-id="${spot.id}">
            <div class="spot-card-left">
              <div class="spot-rank-pill ${topCls}">${rankPad}</div>
              <div class="spot-info">
                <span class="spot-name-main">${mainName}</span>
                <div class="spot-meta-row">
                  <span>${subName}</span>
                  <span>·</span>
                  <span>${catName}</span>
                  <span>·</span>
                  <span>${ state.lang === "ko" ? regMeta.ko : regMeta.en }</span>
                </div>
              </div>
            </div>
            <button type="button" class="spot-dive-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
              <span>360°</span>
            </button>
          </article>
        `;
      })
      .join("");

    listEl.querySelectorAll(".spot-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-spot-id");
        const spot = ALL_SPOTS.find((s) => s.id === id);
        if (spot) {
          diveIntoSpotRoadview(spot);
        }
      });
    });
  }

  // =========================================================
  // 3D SKYVIEW DESCENT INTO FULL-BLEED 360° ROADVIEW
  // =========================================================
  async function diveIntoSpotRoadview(spot) {
    state.activeSpot = spot;

    const warpOverlay = document.getElementById("warp-overlay");
    const warpTitle = document.getElementById("warp-spot-title");
    const warpSub = document.getElementById("warp-spot-sub");

    const dispName = getSpotDisplayName(spot, state.lang);
    if (warpTitle) {
      warpTitle.textContent =
        state.lang === "ko" ? `${spot.ko} · ${spot.en}` : `${dispName} · ${spot.ko}`;
    }
    if (warpSub) {
      warpSub.textContent = getUIString("divingMsg", "Descending into street-level 360° Roadview...");
    }
    if (warpOverlay) {
      warpOverlay.classList.remove("hidden");
    }

    // 1. Steep 3D Aerial Skyview Dive directly onto the rooftop/landmark
    if (map) {
      map.flyTo({
        center: [spot.lng, spot.lat],
        zoom: 18.5,
        pitch: 75,
        bearing: (spot.rank % 2 === 0 ? 1 : -1) * 22,
        speed: 2.2,
        curve: 1.4,
        essential: true
      });
    }

    // 2. Resolve nearest live 360° Roadview node via backend
    const rvPromise = fetch(
      `/api/kakao-rv?lat=${encodeURIComponent(spot.lat)}&lng=${encodeURIComponent(spot.lng)}`
    )
      .then((r) => r.json())
      .catch(() => ({
        ok: false,
        lat: spot.lat,
        lng: spot.lng,
        distance_m: 0,
        addr: "",
        shot_date: "",
        embed_url: `https://map.kakao.com/link/roadview/${spot.lat},${spot.lng}`
      }));

    const [rvData] = await Promise.all([
      rvPromise,
      new Promise((resolve) => setTimeout(resolve, 860))
    ]);

    if (warpOverlay) {
      warpOverlay.classList.add("hidden");
    }

    openRoadviewModal(spot, rvData);
  }

  function openRoadviewModal(spot, rvData) {
    state.rvData = rvData;
    const modal = document.getElementById("roadview-modal");
    const regMeta = REGION_META[spot.region] || REGION_META.seoul;
    const rankPad = String(spot.rank).padStart(2, "0");

    document.getElementById("rv-rank-badge").textContent = `#${rankPad} ${regMeta.en.toUpperCase()}`;
    document.getElementById("rv-spot-title").textContent =
      state.lang === "ko"
        ? `${spot.ko} (${spot.en || ""})`
        : `${getSpotDisplayName(spot, state.lang)} · ${spot.ko}`;

    const metaParts = [];
    if (rvData.addr || rvData.st_name) {
      metaParts.push([rvData.addr, rvData.st_name].filter(Boolean).join(" "));
    } else {
      metaParts.push(`${spot.lat.toFixed(4)}° N, ${spot.lng.toFixed(4)}° E`);
    }
    if (rvData.shot_date) {
      metaParts.push(`Captured ${rvData.shot_date.slice(0, 7)}`);
    }
    document.getElementById("rv-spot-meta").textContent = metaParts.join(" · ");

    const roadBtn = document.getElementById("btn-rv-kakao-road");
    const walkBtn = document.getElementById("btn-rv-kakao-walk");

    roadBtn.classList.add("active");
    walkBtn.classList.remove("active");
    document.getElementById("label-rv-kakao-road").textContent =
      state.lang === "ko" ? "도로 360° 뷰" : "Street 360°";

    if (rvData.walk_node) {
      walkBtn.classList.remove("hidden");
      document.getElementById("label-rv-kakao-walk").textContent =
        state.lang === "ko" ? "경내·탐방로 360° 뷰" : "Interior Walk 360°";
    } else {
      walkBtn.classList.add("hidden");
    }

    loadRoadviewIframe(rvData.embed_url);
    modal.classList.remove("hidden");
  }

  function loadRoadviewIframe(url) {
    const iframe = document.getElementById("kakao-rv-iframe");
    const loading = document.getElementById("rv-loading");
    if (!iframe) return;

    if (loading) loading.classList.remove("hidden");
    iframe.onload = () => {
      if (loading) loading.classList.add("hidden");
    };
    iframe.src = url;
    setTimeout(() => {
      if (loading) loading.classList.add("hidden");
    }, 1700);
  }

  function closeRoadviewModal() {
    const modal = document.getElementById("roadview-modal");
    const iframe = document.getElementById("kakao-rv-iframe");
    if (modal) modal.classList.add("hidden");
    if (iframe) iframe.src = "about:blank";

    if (map && state.activeSpot) {
      const regMeta = REGION_META[state.activeSpot.region] || REGION_META.seoul;
      map.flyTo({
        center: [state.activeSpot.lng, state.activeSpot.lat],
        zoom: Math.max(regMeta.zoom + 0.8, 12.6),
        pitch: state.is3DPitch ? 58 : 0,
        bearing: 0,
        duration: 1100
      });
    }
  }

  // =========================================================
  // EVENT BINDINGS
  // =========================================================
  function bindEvents() {
    document.getElementById("brand-home")?.addEventListener("click", () => {
      selectRegion("all", true);
    });

    document.getElementById("btn-reset-korea")?.addEventListener("click", () => {
      selectRegion("all", true);
    });

    // Skyview Mode Switcher (Hybrid Multilingual vs Pure Clean Satellite)
    document.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const styleKey = btn.getAttribute("data-style");
        if (!styleKey || styleKey === state.mapStyle) return;
        state.mapStyle = styleKey;
        document.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (map) {
          map.setStyle(buildSkyviewStyle(state.mapStyle, state.lang));
        }
      });
    });

    // 3D Tilt Toggle
    const pitchBtn = document.getElementById("btn-toggle-pitch");
    pitchBtn?.addEventListener("click", () => {
      state.is3DPitch = !state.is3DPitch;
      pitchBtn.classList.toggle("active", state.is3DPitch);
      document.getElementById("pitch-label").textContent = state.is3DPitch ? "3D 58°" : "2D Top";
      if (map) {
        map.easeTo({ pitch: state.is3DPitch ? 58 : 0, duration: 650 });
      }
    });

    // Pin Density Mode
    const pinBtn = document.getElementById("btn-toggle-pins");
    pinBtn?.addEventListener("click", () => {
      state.expandAllPins = !state.expandAllPins;
      pinBtn.classList.toggle("active", state.expandAllPins);
      document.getElementById("pin-mode-label").textContent = state.expandAllPins
        ? "All 100 Labels"
        : "Smart Pins";
      renderMapMarkers();
    });

    // Search Input
    const searchInput = document.getElementById("spot-search-input");
    const clearBtn = document.getElementById("btn-clear-search");

    searchInput?.addEventListener("input", () => {
      state.searchQuery = searchInput.value;
      clearBtn?.classList.toggle("hidden", !state.searchQuery);
      updateRegionBanner();
      renderSpotList();
      renderMapMarkers();
    });

    clearBtn?.addEventListener("click", () => {
      searchInput.value = "";
      state.searchQuery = "";
      clearBtn.classList.add("hidden");
      updateRegionBanner();
      renderSpotList();
      renderMapMarkers();
    });

    // Category Filter Chips
    document.querySelectorAll(".cat-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const cat = chip.getAttribute("data-cat") || "all";
        state.activeCategory = cat;
        document.querySelectorAll(".cat-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        updateRegionBanner();
        renderSpotList();
        renderMapMarkers();
      });
    });

    // 13-Language Switcher (Also updates Skyview Aerial Map Labels to Selected Language!)
    const langSelect = document.getElementById("lang-select");
    langSelect?.addEventListener("change", () => {
      state.lang = langSelect.value;
      document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
      syncLocalizedUIStrings();
      renderRegionTabs();
      updateRegionBanner();
      renderSpotList();
      if (map) {
        map.setStyle(buildSkyviewStyle(state.mapStyle, state.lang));
      } else {
        renderMapMarkers();
      }
    });

    // Roadview HUD Controls
    document.getElementById("btn-close-rv")?.addEventListener("click", closeRoadviewModal);

    document.getElementById("btn-rv-kakao-road")?.addEventListener("click", () => {
      if (!state.rvData) return;
      document.getElementById("btn-rv-kakao-road").classList.add("active");
      document.getElementById("btn-rv-kakao-walk").classList.remove("active");
      loadRoadviewIframe(state.rvData.embed_url);
    });

    document.getElementById("btn-rv-kakao-walk")?.addEventListener("click", () => {
      if (!state.rvData || !state.rvData.walk_node) return;
      document.getElementById("btn-rv-kakao-walk").classList.add("active");
      document.getElementById("btn-rv-kakao-road").classList.remove("active");
      loadRoadviewIframe(state.rvData.walk_node.embed_url);
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const modal = document.getElementById("roadview-modal");
        if (modal && !modal.classList.contains("hidden")) {
          closeRoadviewModal();
        }
      }
    });

    // Mobile Bottom Sheet Toggle
    const handle = document.getElementById("drawer-drag-handle");
    const drawer = document.getElementById("explorer-drawer");
    handle?.addEventListener("click", () => {
      drawer?.classList.toggle("collapsed");
    });
  }

  // =========================================================
  // BOOTSTRAP
  // =========================================================
  window.addEventListener("DOMContentLoaded", () => {
    syncLocalizedUIStrings();
    renderRegionTabs();
    updateRegionBanner();
    renderSpotList();
    bindEvents();
    initMap();
  });
})();
