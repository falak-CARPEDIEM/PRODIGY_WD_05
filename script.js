// ======================
// API KEYS (replace locally)
// ======================
const API_KEY = window.LOCAL_API_KEY || "";
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather?units=metric";

// Optional WeatherAPI fallback for UV (disabled now)
const USE_WEATHERAPI_FALLBACK = false;
const WEATHERAPI_KEY = "";

// Theme + behavior toggles
const START_AS_LIGHT = false;
const SHOW_TIME = false;

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
  const t = Math.round(temp); 
  const f = Math.round(feels);
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

// =============== DAY/NIGHT ICON
function updateAstroAndTime(dtUnix, timezoneShiftSeconds, sunriseUnix, sunsetUnix) {
  const localNowSec = (dtUnix ?? Date.now()/1000) + (timezoneShiftSeconds || 0);
  const sr = sunriseUnix ? sunriseUnix + (timezoneShiftSeconds || 0) : null;
  const ss = sunsetUnix ? sunsetUnix + (timezoneShiftSeconds || 0) : null;

  let isDay = true;
  if (sr && ss) {
    isDay = localNowSec >= sr && localNowSec < ss;
  }

  astroIcon.classList.remove("sun","moon");
  astroIcon.classList.add(isDay ? "sun" : "moon");
}

// =============== RENDER WEATHER
function renderWeather(data) {
  if(!data) return;

  const { name, sys, main, weather, wind, visibility, dt, timezone, rain, snow, coord } = data;
  const cond = weather?.[0] || null;

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

  feelsLikeEl.textContent = `${Math.round(feels)}°`;
  humidityEl.textContent = main?.humidity != null ? `${main.humidity}%` : "--%";
  pressureEl.textContent = main?.pressure != null ? `${main.pressure} hPa` : "-- hPa";

  const windSpeed = wind?.speed != null ? wind.speed * 3.6 : null;
  windEl.textContent = windSpeed != null ? `${windSpeed.toFixed(0)} km/h` : "-- km/h";
  windDirEl.textContent = wind?.deg != null ? `${wind.deg}° ${getWindDirection(wind.deg)}` : "--";

  visibilityEl.textContent = visibility != null ? `${(visibility/1000).toFixed(1)} km` : "-- km";

  let precipVal = 0;
  if (rain?.["1h"] || rain?.["3h"]) precipVal = rain["1h"] || rain["3h"];
  if (snow?.["1h"] || snow?.["3h"]) precipVal = snow["1h"] || snow["3h"];
  precipEl.textContent = `${precipVal.toFixed(1)} mm`;

  airQualityEl.textContent = "--";
  airTextEl.textContent = "Air quality unavailable."; // AQI disabled for safety
  uvIndexEl.textContent = "--";
  uvTextEl.textContent = "UV disabled (OneCall requires paid account)";

  updateAstroAndTime(dt, timezone, sys?.sunrise, sys?.sunset);

  if (phoneShell) phoneShell.scrollTop = 0;

  setStatus("Weather updated ✓");
}

// =============== FETCH WEATHER
async function fetchWeatherByCity(city) {
  if (!API_KEY) {
    setStatus("Please add your OpenWeather API key.", true);
    return;
  }
  try {
    setStatus("Loading weather…");
    const url = `${BASE_URL}&q=${encodeURIComponent(city)}&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather error (${res.status})`);
    const data = await res.json();
    renderWeather(data);
  } catch (err) {
    console.error(err);
    setStatus(err.message, true);
  }
}

async function fetchWeatherByCoords(lat, lon) {
  if (!API_KEY) return setStatus("Add API key.", true);

  try {
    setStatus("Loading your location weather…");
    const url = `${BASE_URL}&lat=${lat}&lon=${lon}&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Location error (${res.status})`);
    const data = await res.json();
    renderWeather(data);
  } catch (err) {
    console.error(err);
    setStatus(err.message, true);
  }
}

// =============== EVENTS
if (searchForm && cityInput) {
  searchForm.addEventListener("submit", e => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (!city) return setStatus("Please type a city name.", true);
    fetchWeatherByCity(city);
  });
}

if (locBtn) {
  locBtn.addEventListener("click", () => {
    if (!navigator.geolocation) return setStatus("Geolocation not supported.", true);
    setStatus("Requesting your location…");
    navigator.geolocation.getCurrentPosition(
      pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
      err => setStatus("Location access denied.", true),
      { enableHighAccuracy:true, timeout:12000 }
    );
  });
}

// ======= UV & AQI DISABLED (401 FIX) =======
// fetchAirQuality(lat, lon);
// fetchUV(lat, lon);

// ==== DO NOT ADD fetchUV() ANYWHERE ====

