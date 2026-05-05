'use client';

const palette = ['#5B4FBF', '#1E5FAA', '#0E7B7B', '#B6711A', '#B33030', '#8A4FBF'];

export default function Avatar({ name = '?', size = 24, color }) {
  const initials = String(name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
  const bg = color || palette[String(name || '?').charCodeAt(0) % palette.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        color: '#fff',
        fontSize: size * 0.4,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: 0.5,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
