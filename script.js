// ======================
// API KEYS
// ======================
const API_KEY = window.LOCAL_API_KEY || "";

// ======================
// BASE URL (Cloudflare Worker Proxy)
// ======================
const BASE_URL = "https://yellow-salad-e9d7falak-weather-proxy.falakmujawar27.workers.dev";

// ======================
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

// ====================== Helpers
function setStatus(msg, error = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", error);
}
function getWindDirection(deg) {
  if (deg == null) return "--";
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}
function uvLabel(u) {
  if (u < 3) return "Low";
  if (u < 6) return "Moderate";
  if (u < 8) return "High";
  if (u < 11) return "Very High";
  return "Extreme";
}
function aqiLabel(aqi) {
  return ["","Good","Fair","Moderate","Poor","Very Poor"][aqi] || "--";
}

// ====================== RENDER
function renderWeather(data) {
  const { name, main, weather, wind, sys, visibility, rain, snow, coord } = data;
  const cond = weather?.[0];

  cityNameEl.textContent = name;
  tempEl.textContent = Math.round(main.temp);
  conditionEl.textContent = cond?.main ?? "--";
  hiTempEl.textContent = Math.round(main.temp_max);
  lowTempEl.textContent = Math.round(main.temp_min);

  summaryTextEl.textContent = `${cond?.description} with a temperature of ${Math.round(main.temp)}°`;

  feelsLikeEl.textContent = `${Math.round(main.feels_like)}°`;
  humidityEl.textContent = `${main.humidity}%`;
  pressureEl.textContent = `${main.pressure} hPa`;

  windEl.textContent = `${(wind.speed * 3.6).toFixed(0)} km/h`;
  windDirEl.textContent = `${wind.deg}° ${getWindDirection(wind.deg)}`;

  visibilityEl.textContent = `${(visibility/1000).toFixed(1)} km`;

  const rainVal = rain?.["1h"] || rain?.["3h"] || snow?.["1h"] || snow?.["3h"] || 0;
  precipEl.textContent = `${rainVal.toFixed(1)} mm`;

  fetchAirQuality(coord.lat, coord.lon);
  fetchUV(coord.lat, coord.lon);

  setStatus("Weather updated ✓");
}

// ====================== PROXY FETCH
async function proxyFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error("Proxy error " + res.status);
  return res.json();
}

// ====================== WEATHER
async function fetchWeatherByCity(city) {
  try {
    setStatus("Loading weather…");
    const data = await proxyFetch(`/weather?q=${city}&units=metric&appid=${API_KEY}`);
    renderWeather(data);
  } catch (e) {
    setStatus(e.message, true);
  }
}

async function fetchWeatherByCoords(lat, lon) {
  try {
    setStatus("Loading your location…");
    const data = await proxyFetch(`/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
    renderWeather(data);
  } catch (e) {
    setStatus(e.message, true);
  }
}

// ====================== AQI
async function fetchAirQuality(lat, lon) {
  try {
    const json = await proxyFetch(`/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
    const item = json.list[0];
    airQualityEl.textContent = aqiLabel(item.main.aqi);
    airTextEl.textContent = `PM2.5: ${item.components.pm2_5} μg/m³`;
  } catch {
    airQualityEl.textContent = "--";
    airTextEl.textContent = "Unavailable";
  }
}

// ====================== UV INDEX (OneCall)
async function fetchUV(lat, lon) {
  try {
    const json = await proxyFetch(`/onecall?lat=${lat}&lon=${lon}&exclude=hourly,daily,minutely,alerts&appid=${API_KEY}`);
    const uvi = json.current?.uvi;
    uvIndexEl.textContent = uvi.toFixed(1);
    uvTextEl.textContent = uvLabel(uvi);
  } catch {
    uvIndexEl.textContent = "--";
    uvTextEl.textContent = "Unavailable";
  }
}

// ====================== EVENTS
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return setStatus("Enter a city", true);
  fetchWeatherByCity(city);
});

locBtn.addEventListener("click", () => {
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    () => setStatus("Location denied", true)
  );
});
