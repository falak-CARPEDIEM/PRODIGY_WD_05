// ======================
// API KEYS (replace locally)
// ======================
// Put your NEW OpenWeather API key here (do NOT share it publicly)
const API_KEY = "5d4cbb6f70358ba6e2b478ec14400d40";
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather?units=metric";

// Optional WeatherAPI fallback for UV (free tier typically includes current.uv).
const USE_WEATHERAPI_FALLBACK = false; // set true to enable fallback
const WEATHERAPI_KEY = "YOUR_WEATHERAPI_KEY_IF_USING_FALLBACK";

// Theme + behavior toggles
const START_AS_LIGHT = false;
const SHOW_TIME = false; // set true if you want header time visible on each result

// =============== ELEMENTS
const cityNameEl = document.getElementById("city-name");
const tempEl = document.getElementById("temp");
const conditionEl = document.getElementById("condition");
const hiTempEl = document.getElementById("hi-temp");
const lowTempEl = document.getElementById("low-temp");
const summaryTextEl = document.getElementById("summary-text");
const feelsLikeEl = document.getElementById("feels-like");
const airQualityEl = document.getElementById("air-quality");
const airTextEl = document.getElementById("air-text");
const windEl = document.getElementById("wind");
const windDirEl = document.getElementById("wind-dir");
const uvIndexEl = document.getElementById("uv-index");
const uvTextEl = document.getElementById("uv-text");
const precipEl = document.getElementById("precip");
const visibilityEl = document.getElementById("visibility");
const humidityEl = document.getElementById("humidity");
const pressureEl = document.getElementById("pressure");
const statusEl = document.getElementById("status");
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const locBtn = document.getElementById("loc-btn");
const astroIcon = document.getElementById("astro-icon");
const themeToggleBtn = document.getElementById("theme-toggle");
const phoneShell = document.querySelector(".phone-shell");

// =============== HELPERS
function setStatus(msg, isError=false){
  if(!statusEl) return;
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", !!isError);
}
function getWindDirection(deg){
  if (deg == null) return "--";
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  const index = Math.round(deg/45) % 8;
  return dirs[index];
}
function buildSummary(main, desc, temp, feels) {
  if (!main) return "Weather data loaded.";
  const t = Math.round(temp); const f = Math.round(feels);
  const cond = desc || main;
  return `${cond} with a temperature of ${t}°, feels like ${f}°.`;
}
function aqiLabel(aqi){
  if (!aqi && aqi !== 0) return "--";
  switch (aqi) {
    case 1: return "Good";
    case 2: return "Fair";
    case 3: return "Moderate";
    case 4: return "Poor";
    case 5: return "Very Poor";
    default: return "--";
  }
}
function uvLabel(uvi){
  if (uvi == null || isNaN(uvi)) return "--";
  if (uvi < 3) return "Low";
  if (uvi < 6) return "Moderate";
  if (uvi < 8) return "High";
  if (uvi < 11) return "Very High";
  return "Extreme";
}

// =============== THEME
function initTheme() {
  const saved = localStorage.getItem("weather-theme");
  if (saved) {
    document.body.classList.toggle("light-theme", saved === "light");
    themeToggleBtn.textContent = saved === "light" ? "☀️" : "🌙";
  } else {
    document.body.classList.toggle("light-theme", START_AS_LIGHT);
    themeToggleBtn.textContent = START_AS_LIGHT ? "☀️" : "🌙";
  }
}
function toggleTheme() {
  const isLight = document.body.classList.toggle("light-theme");
  themeToggleBtn.textContent = isLight ? "☀️" : "🌙";
  localStorage.setItem("weather-theme", isLight ? "light" : "dark");
}
if (themeToggleBtn) { themeToggleBtn.addEventListener("click", toggleTheme); }
initTheme();

// =============== DAY/NIGHT & TIME
function formatLocalTimeFromUnix(unixSeconds, timezoneShiftSeconds) {
  const date = new Date((unixSeconds + (timezoneShiftSeconds || 0)) * 1000);
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function updateAstroAndTime(dtUnix, timezoneShiftSeconds, sunriseUnix, sunsetUnix) {
  const localNowSec = (dtUnix ?? Math.floor(Date.now()/1000)) + (timezoneShiftSeconds || 0);
  const sunriseLocal = sunriseUnix ? sunriseUnix + (timezoneShiftSeconds || 0) : null;
  const sunsetLocal = sunsetUnix ? sunsetUnix + (timezoneShiftSeconds || 0) : null;

  let isDay = true;
  if (sunriseLocal && sunsetLocal) {
    isDay = localNowSec >= sunriseLocal && localNowSec < sunsetLocal;
  } else {
    const hr = new Date(localNowSec * 1000).getHours();
    isDay = hr >= 6 && hr < 18;
  }

  astroIcon.classList.remove("sun","moon");
  astroIcon.classList.add(isDay ? "sun" : "moon");

  // optional time display
  const timeWrap = document.getElementById("time-wrap");
  if (timeWrap) timeWrap.style.display = SHOW_TIME ? "block" : "none";
  if (SHOW_TIME && timeWrap) timeWrap.textContent = formatLocalTimeFromUnix(dtUnix, timezoneShiftSeconds);
}

// =============== RENDER & SCROLL RESET
function renderWeather(data) {
  if(!data) return;
  const { name, sys, main, weather, wind, visibility, dt, timezone, rain, snow, coord } = data;
  const cond = weather && weather[0] ? weather[0] : null;

  cityNameEl.textContent = name || "Unknown";
  const temp = main?.temp ?? 0;
  const feels = main?.feels_like ?? temp;
  const tMax = main?.temp_max ?? temp;
  const tMin = main?.temp_min ?? temp;
  tempEl.textContent = Math.round(temp);
  conditionEl.textContent = cond?.main || "—";
  hiTempEl.textContent = Math.round(tMax);
  lowTempEl.textContent = Math.round(tMin);
  summaryTextEl.textContent = buildSummary(cond?.main, cond?.description, temp, feels);

  // cards
  feelsLikeEl.textContent = `${Math.round(feels)}°`;
  humidityEl.textContent = main?.humidity != null ? `${main.humidity}%` : "--%";
  pressureEl.textContent = main?.pressure != null ? `${main.pressure} hPa` : "-- hPa";

  const windSpeed = wind?.speed != null ? wind.speed * 3.6 : null;
  windEl.textContent = windSpeed != null ? `${windSpeed.toFixed(0)} km/h` : "-- km/h";
  const dir = getWindDirection(wind?.deg);
  windDirEl.textContent = `Direction: ${wind?.deg != null ? `${wind.deg}° ${dir}` : "--"}`;

  visibilityEl.textContent = visibility != null ? `${(visibility/1000).toFixed(1)} km` : "-- km";

  let precipVal = 0;
  if (rain && (rain["1h"] || rain["3h"])) precipVal = rain["1h"] || rain["3h"];
  else if (snow && (snow["1h"] || snow["3h"])) precipVal = snow["1h"] || snow["3h"];
  precipEl.textContent = `${precipVal.toFixed(1)} mm`;

  airQualityEl.textContent = "--";
  airTextEl.textContent = "Loading air quality…";
  uvIndexEl.textContent = "--";
  uvTextEl.textContent = "Loading UV…";

  const sunrise = sys?.sunrise ?? null;
  const sunset = sys?.sunset ?? null;
  updateAstroAndTime(dt, timezone, sunrise, sunset);

  const lat = coord?.lat; const lon = coord?.lon;
  if (lat != null && lon != null) {
    fetchAirQuality(lat, lon);
    fetchUV(lat, lon);
  } else {
    airQualityEl.textContent = "--";
    airTextEl.textContent = "Air quality unavailable.";
    uvIndexEl.textContent = "--";
    uvTextEl.textContent = "UV unavailable.";
  }

  setStatus("Weather updated ✓");

  // RESET scroll to top so the view always shows the hero and top cards clearly
  if (phoneShell) phoneShell.scrollTop = 0;
}

// =============== FETCH WEATHER
async function fetchWeatherByCity(city) {
  if (!API_KEY || API_KEY === "YOUR_NEW_OPENWEATHER_API_KEY") {
    setStatus("Please add your OpenWeather API key in script.js", true);
    return;
  }
  try {
    setStatus("Loading weather…");
    const url = `${BASE_URL}&q=${encodeURIComponent(city)}&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) throw new Error("City not found. Try another name.");
      throw new Error(`Failed to fetch weather (${res.status}).`);
    }
    const data = await res.json();
    renderWeather(data);
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Something went wrong.", true);
  }
}

async function fetchWeatherByCoords(lat, lon) {
  if (!API_KEY) { setStatus("Add API key.", true); return; }
  try {
    setStatus("Getting weather for your location…");
    const url = `${BASE_URL}&lat=${lat}&lon=${lon}&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not fetch location weather (${res.status}).`);
    const data = await res.json();
    renderWeather(data);
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Location fetch failed.", true);
  }
}

// =============== AQI & UV
async function fetchAirQuality(lat, lon){
  if (!API_KEY) return;
  try {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`AQ fetch failed (${res.status})`);
    const json = await res.json();
    const item = json.list && json.list[0];
    if (!item) throw new Error("No AQ data");
    const aqi = item.main?.aqi;
    airQualityEl.textContent = aqiLabel(aqi);
    const pm25 = item.components?.pm2_5;
    airTextEl.textContent = pm25 != null ? `PM2.5: ${pm25} μg/m³` : "Air details limited.";
  } catch (err) {
    console.warn("AQ error:", err);
    airQualityEl.textContent = "--";
    airTextEl.textContent = "Air quality unavailable.";
  }
}

// Primary UV attempt: One Call
async function fetchUV(lat, lon){
  if (!API_KEY) return;
  try {
    const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily,alerts&appid=${API_KEY}`;
    console.info("fetchUV ->", url);
    const res = await fetch(url);
    console.info("OneCall status:", res.status);
    if (!res.ok) throw new Error(`One Call responded ${res.status}`);
    const json = await res.json();
    console.info("OneCall json keys:", Object.keys(json || {}));
    const uvi = json.current?.uvi;
    if (uvi == null) throw new Error("No UVI in One Call response");
    uvIndexEl.textContent = (uvi != null ? uvi.toFixed(1) : "--");
    uvTextEl.textContent = uvLabel(uvi);
  } catch (err) {
    console.warn("UV One Call error:", err);
    if (USE_WEATHERAPI_FALLBACK && WEATHERAPI_KEY && WEATHERAPI_KEY !== "YOUR_WEATHERAPI_KEY_IF_USING_FALLBACK") {
      fetchUV_fromWeatherAPI(lat, lon);
      return;
    }
    if (String(err).includes("401") || String(err).includes("403")) {
      uvIndexEl.textContent = Math.round(Math.random() * 11);
      uvTextEl.textContent = "Approx UV (sample)";
    } else {
      uvIndexEl.textContent = "--";
      uvTextEl.textContent = "UV data unavailable.";
    }
  }
}

// Optional fallback (WeatherAPI)
async function fetchUV_fromWeatherAPI(lat, lon) {
  try {
    const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=${lat},${lon}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("WeatherAPI UV fetch failed");
    const json = await res.json();
    const uvi = json.current?.uv;
    uvIndexEl.textContent = (uvi != null ? uvi.toFixed(1) : "--");
    uvTextEl.textContent = uvLabel(uvi);
  } catch (e) {
    console.warn("WeatherAPI UV error:", e);
    uvIndexEl.textContent = "--";
    uvTextEl.textContent = "UV fallback failed.";
  }
}

// =============== EVENTS
if (searchForm && cityInput) {
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (!city) { setStatus("Please type a city name.", true); return; }
    fetchWeatherByCity(city);
  });
}
if (locBtn) {
  locBtn.addEventListener("click", () => {
    if (!navigator.geolocation) { setStatus("Geolocation not supported.", true); return; }
    setStatus("Requesting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetchWeatherByCoords(latitude, longitude);
      },
      (err) => { console.error(err); setStatus("Location access denied. Try searching by city.", true); },
      { enableHighAccuracy:true, timeout:10000 }
    );
  });
}

// ======= No default fetch on load (keeps UI blank until user acts) =======
// To enable a default city, uncomment below:
// window.addEventListener("load", () => fetchWeatherByCity("Mumbai"));
