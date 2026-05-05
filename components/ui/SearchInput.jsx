'use client';
import { Search } from '../icons';

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  width = 240,
}) {
  return (
    <div className="input" style={{ width, height: 32 }}>
      <Search size={14} color="var(--ink-400)" />
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
