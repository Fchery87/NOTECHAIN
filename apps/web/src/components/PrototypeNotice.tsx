import type { ReactNode } from 'react';

interface PrototypeNoticeProps {
  title: string;
  children: ReactNode;
}

export function PrototypeNotice({ title, children }: PrototypeNoticeProps) {
  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4 text-sm text-amber-900 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M12 3a9 9 0 110 18 9 9 0 010-18z"
            />
          </svg>
        </div>
        <div>
          <p className="font-medium text-amber-950">{title}</p>
          <p className="mt-1 leading-relaxed text-amber-800">{children}</p>
        </div>
      </div>
    </div>
  );
}
