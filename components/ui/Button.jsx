'use client';

const VARIANT_CLASS = {
  default: 'btn',
  primary: 'btn btn-primary',
  accent: 'btn btn-accent',
  ghost: 'btn btn-ghost',
};

const SIZE_CLASS = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export default function Button({
  children,
  variant = 'default',
  size = 'md',
  icon: IconComp,
  iconRight,
  className = '',
  ...rest
}) {
  const cls = [
    VARIANT_CLASS[variant] || VARIANT_CLASS.default,
    SIZE_CLASS[size] || '',
    !children && IconComp ? 'btn-icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const iconSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;
  return (
    <button className={cls} {...rest}>
      {IconComp && <IconComp size={iconSize} />}
      {children}
      {iconRight && (() => { const R = iconRight; return <R size={iconSize} />; })()}
    </button>
  );
}
