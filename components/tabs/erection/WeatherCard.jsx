'use client';
import { useEffect, useState } from 'react';
import { fetchWeather, describeWeatherCode } from '../../../lib/weather';
import * as Icons from '../../icons';

// Right-rail weather card. Shows current conditions + 3-day forecast.
// Falls back gracefully when project has no lat/lng.

export default function WeatherCard({ project }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const lat = project.lat != null ? Number(project.lat) : null;
  const lng = project.lng != null ? Number(project.lng) : null;
  const hasCoords = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);

  useEffect(() => {
    let cancelled = false;
    if (!hasCoords) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchWeather(lat, lng).then((d) => {
      if (!cancelled) {
        setData(d);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [lat, lng, hasCoords]);

  if (!hasCoords) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <div className="t-overline" style={{ marginBottom: 8 }}>Weather</div>
        <div style={{ fontSize: 12, color: 'var(--ink-500)', lineHeight: 1.5 }}>
          Set <span className="mono">lat</span> and <span className="mono">lng</span> on the project to see live weather and a 3-day forecast.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: 16, minHeight: 180 }}>
        <div className="t-overline" style={{ marginBottom: 8 }}>Weather</div>
        <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>Loading…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <div className="t-overline" style={{ marginBottom: 8 }}>Weather</div>
        <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>
          Couldn&apos;t fetch weather right now. Check internet, retry later.
        </div>
      </div>
    );
  }

  const c = describeWeatherCode(data.current.code);
  const CurrentIcon = Icons[c.icon] || Icons.Cloud;
  // skip first day (today is in `current`)
  const upcoming = (data.daily || []).slice(1, 4);

  return (
    <div className="card" style={{ padding: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div className="t-overline">Weather</div>
        {project.location && (
          <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>
            {String(project.location).split(',')[0]}
          </div>
        )}
      </div>

      {/* Current */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 10,
            background: 'color-mix(in oklab, var(--accent) 8%, white)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <CurrentIcon size={28} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="mono tnum"
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: 'var(--ink-900)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {data.current.temp}°C
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>
            {c.label}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 14,
          paddingBottom: 14,
          borderBottom: '1px solid var(--line)',
        }}
      >
        <Metric label="Humidity" value={`${data.current.humidity}%`} />
        <Metric
          label="Wind"
          value={
            <>
              <span className="mono tnum">{data.current.wind}</span>
              <span style={{ fontSize: 10, marginLeft: 2, color: 'var(--ink-500)' }}>km/h</span>
            </>
          }
        />
      </div>

      {/* 3-day forecast */}
      <div className="t-overline" style={{ marginBottom: 8 }}>Next 3 days</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {upcoming.map((d) => {
          const desc = describeWeatherCode(d.code);
          const DIcon = Icons[desc.icon] || Icons.Cloud;
          const date = new Date(d.date);
          const dayLabel = date.toLocaleDateString('en-GB', { weekday: 'short' });
          const isHighWind = d.windMax >= 30;
          const isWet = d.precip >= 1;
          return (
            <div
              key={d.date}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '4px 0',
              }}
            >
              <div
                style={{
                  width: 30,
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--ink-700)',
                }}
              >
                {dayLabel}
              </div>
              <DIcon size={16} color="var(--ink-500)" />
              <div
                style={{
                  flex: 1,
                  fontSize: 11.5,
                  color: 'var(--ink-500)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {desc.label}
              </div>
              {(isHighWind || isWet) && (
                <span
                  style={{
                    fontSize: 10,
                    color: isHighWind
                      ? 'var(--status-alert)'
                      : 'var(--status-progress)',
                    marginRight: 4,
                  }}
                >
                  {isHighWind ? `${d.windMax} km/h` : `${d.precip} mm`}
                </span>
              )}
              <div
                className="mono tnum"
                style={{
                  fontSize: 12,
                  color: 'var(--ink-900)',
                  width: 60,
                  textAlign: 'right',
                }}
              >
                {d.tempMin}° / <strong>{d.tempMax}°</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="t-caption" style={{ marginBottom: 2 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--ink-900)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
