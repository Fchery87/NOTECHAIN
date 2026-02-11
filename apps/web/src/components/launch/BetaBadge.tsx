'use client';

interface BetaBadgeProps {
  variant?: 'default' | 'subtle' | 'pill';
}

export default function BetaBadge({ variant = 'default' }: BetaBadgeProps) {
  const variants = {
    default: 'bg-amber-100 text-amber-800 border-amber-200',
    subtle: 'bg-stone-100 text-stone-600 border-stone-200',
    pill: 'bg-gradient-to-r from-amber-500 to-rose-500 text-white border-0',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${variants[variant]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      Beta
    </span>
  );
}
