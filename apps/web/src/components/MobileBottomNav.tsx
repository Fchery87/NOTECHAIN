'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { appNavItems, isNavActive } from './appNav';

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {appNavItems.map(item => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-[60px] flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors ${
                active ? 'text-stone-900' : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              <Icon className={`h-[22px] w-[22px] ${active ? 'text-amber-600' : ''}`} />
              <span className="text-[10px] font-medium">{item.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
