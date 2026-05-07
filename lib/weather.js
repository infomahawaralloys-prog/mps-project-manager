// ============================================================
// Weather — Open-Meteo (free, no API key required)
// Docs: https://open-meteo.com/en/docs
// ============================================================

const WEATHER_CODES = {
  0: { label: 'Clear', icon: 'Sun' },
  1: { label: 'Mainly clear', icon: 'Sun' },
  2: { label: 'Partly cloudy', icon: 'Cloud' },
  3: { label: 'Overcast', icon: 'Cloud' },
  45: { label: 'Fog', icon: 'Cloud' },
  48: { label: 'Rime fog', icon: 'Cloud' },
  51: { label: 'Light drizzle', icon: 'CloudRain' },
  53: { label: 'Drizzle', icon: 'CloudRain' },
  55: { label: 'Heavy drizzle', icon: 'CloudRain' },
  61: { label: 'Light rain', icon: 'CloudRain' },
  63: { label: 'Rain', icon: 'CloudRain' },
  65: { label: 'Heavy rain', icon: 'CloudRain' },
  71: { label: 'Light snow', icon: 'CloudRain' },
  73: { label: 'Snow', icon: 'CloudRain' },
  75: { label: 'Heavy snow', icon: 'CloudRain' },
  80: { label: 'Showers', icon: 'CloudRain' },
  81: { label: 'Heavy showers', icon: 'CloudRain' },
  82: { label: 'Violent showers', icon: 'CloudRain' },
  95: { label: 'Thunderstorm', icon: 'CloudRain' },
  96: { label: 'Storm + hail', icon: 'CloudRain' },
  99: { label: 'Severe storm', icon: 'CloudRain' },
};

export function describeWeatherCode(code) {
  return WEATHER_CODES[code] || { label: 'Unknown', icon: 'Cloud' };
}

const cache = new Map();
const TTL = 30 * 60 * 1000;

export async function fetchWeather(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;
  const key = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < TTL) return cached.data;

  try {
    const url =
      'https://api.open-meteo.com/v1/forecast?' +
      `latitude=${lat}&longitude=${lng}` +
      '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code' +
      '&daily=temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max,precipitation_sum' +
      '&timezone=auto&forecast_days=4';

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API ${res.status}`);
    const json = await res.json();

    const data = {
      current: {
        temp: Math.round(json.current?.temperature_2m ?? 0),
        humidity: Math.round(json.current?.relative_humidity_2m ?? 0),
        wind: Math.round(json.current?.wind_speed_10m ?? 0),
        code: json.current?.weather_code ?? 0,
      },
      daily: (json.daily?.time || []).map((date, i) => ({
        date,
        tempMax: Math.round(json.daily.temperature_2m_max[i]),
        tempMin: Math.round(json.daily.temperature_2m_min[i]),
        code: json.daily.weather_code[i],
        windMax: Math.round(json.daily.wind_speed_10m_max[i]),
        precip: Math.round(json.daily.precipitation_sum[i] * 10) / 10,
      })),
      timezone: json.timezone,
    };

    cache.set(key, { data, fetchedAt: Date.now() });
    return data;
  } catch (e) {
    console.warn('Weather fetch failed:', e);
    return null;
  }
}
