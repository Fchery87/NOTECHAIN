'use client';

import React, { useEffect, useRef } from 'react';

/**
 * SkipLink component - Allows keyboard users to skip to main content
 * Essential for accessibility compliance (WCAG 2.4.1 Bypass Blocks)
 *
 * @example
 * ```tsx
 * // In layout.tsx or page.tsx
 * <SkipLink targetId="main-content" />
 *
 * // Main content
 * <main id="main-content">
 *   [page content]
 * </main>
 * ```
 */
interface SkipLinkProps {
  /** ID of the element to skip to */
  targetId: string;
  /** Custom link text */
  text?: string;
  /** Additional CSS classes */
  className?: string;
}

export function SkipLink({
  targetId,
  text = 'Skip to main content',
  className = '',
}: SkipLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
      // Set tabindex to allow focus on non-focusable elements
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
    }
  };

  return (
    <a
      ref={linkRef}
      href={`#${targetId}`}
      onClick={handleClick}
      className={`
        fixed top-0 left-0 z-[100]
        px-5 py-3
        bg-stone-900 text-stone-50
        font-medium text-sm
        transform -translate-y-full
        focus:translate-y-0
        transition-transform duration-200
        focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
        ${className}
      `}
    >
      {text}
    </a>
  );
}

/**
 * SkipLinks component - Multiple skip links for complex layouts
 */
interface SkipLinkItem {
  targetId: string;
  text: string;
}

interface SkipLinksProps {
  links: SkipLinkItem[];
}

export function SkipLinks({ links }: SkipLinksProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsVisible(true);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
    }
    setIsVisible(false);
  };

  return (
    <div
      ref={containerRef}
      className={`
        fixed top-0 left-0 right-0 z-[100]
        bg-stone-900
        transform transition-transform duration-200
        ${isVisible ? 'translate-y-0' : '-translate-y-full'}
      `}
    >
      <nav aria-label="Skip links">
        <ul className="flex flex-wrap items-center gap-2 p-3">
          {links.map(link => (
            <li key={link.targetId}>
              <a
                href={`#${link.targetId}`}
                onClick={e => handleLinkClick(e, link.targetId)}
                className="
                  block px-4 py-2
                  text-stone-50 text-sm font-medium
                  rounded-lg
                  hover:bg-stone-800
                  focus:outline-none focus:ring-2 focus:ring-amber-500
                  transition-colors
                "
              >
                {link.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default SkipLink;
