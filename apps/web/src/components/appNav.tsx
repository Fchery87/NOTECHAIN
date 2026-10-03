import { isSharedSpacesSurfaceEnabled } from '@/lib/launchScope';

export type IconProps = { className?: string };

function Icon({ d, className }: { d: string | string[] } & IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {(Array.isArray(d) ? d : [d]).map(path => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
  />
);
export const NotesIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
  />
);
export const TasksIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
  />
);
export const CalendarIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
  />
);
export const MeetingsIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
  />
);
export const TeamsIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
  />
);
export const GraphIcon = (p: IconProps) => (
  <Icon
    {...p}
    d={[
      'M7.5 7.5l3 3m3 3l3 3m-9 0l3-3',
      'M6 9a3 3 0 100-6 3 3 0 000 6zm12 12a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zm6-6a3 3 0 100-6 3 3 0 000 6z',
    ]}
  />
);
export const SearchIcon = (p: IconProps) => (
  <Icon {...p} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
);
export const PlusIcon = (p: IconProps) => <Icon {...p} d="M12 5v14m7-7H5" />;
export const SettingsIcon = (p: IconProps) => (
  <Icon
    {...p}
    d={[
      'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    ]}
  />
);
export const ShieldIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
  />
);
export const LockIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
  />
);
export const ArrowLeftIcon = (p: IconProps) => <Icon {...p} d="M15 19l-7-7 7-7" />;

export function NoteChainMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="36" height="36" rx="9" fill="#1c1917" />
      <path d="M12 14a2 2 0 012-2h6v8h-8v-6z" fill="#f59e0b" />
      <path d="M22 12h4a2 2 0 012 2v6h-6v-8z" fill="#78716c" />
      <path d="M12 22h8v6h-6a2 2 0 01-2-2v-4z" fill="#78716c" />
      <path d="M22 22h6v4a2 2 0 01-2 2h-4v-6z" fill="#f43f5e" />
    </svg>
  );
}

export interface AppNavItem {
  href: string;
  label: string;
  shortLabel: string;
  /** Second key of the `G <key>` jump shortcut. */
  jumpKey: string;
  icon: (p: IconProps) => React.ReactElement;
}

export const appNavItems: AppNavItem[] = [
  { href: '/dashboard', label: 'Home', shortLabel: 'Home', jumpKey: 'h', icon: HomeIcon },
  { href: '/notes', label: 'Notes', shortLabel: 'Notes', jumpKey: 'n', icon: NotesIcon },
  { href: '/tasks', label: 'Tasks', shortLabel: 'Tasks', jumpKey: 't', icon: TasksIcon },
  {
    href: '/meetings',
    label: 'Meetings',
    shortLabel: 'Meetings',
    jumpKey: 'm',
    icon: MeetingsIcon,
  },
  {
    href: '/calendar',
    label: 'Calendar',
    shortLabel: 'Calendar',
    jumpKey: 'c',
    icon: CalendarIcon,
  },
  {
    href: '/graph',
    label: 'Knowledge Map',
    shortLabel: 'Map',
    jumpKey: 'g',
    icon: GraphIcon,
  },
  ...(isSharedSpacesSurfaceEnabled()
    ? [
        {
          href: '/teams',
          label: 'Shared Spaces',
          shortLabel: 'Shared',
          jumpKey: 's',
          icon: TeamsIcon,
        },
      ]
    : []),
];

export const NEW_NOTE_HREF = '/notes?new=1';

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
