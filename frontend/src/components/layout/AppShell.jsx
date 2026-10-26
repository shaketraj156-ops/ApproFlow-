import React, { Suspense, useMemo, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { sectionsForRole } from './navConfig';
import { useAuth } from '../../context/AuthContext';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { PageLoader } from '../common/PageLoader';

export function AppShell() {
  const location = useLocation();
  const { user } = useAuth();

  // The order of the tabs decides which way a page slides in: to the right when you go to a later tab,
  // to the left when you go back to an earlier one, and up when the page is not one of the tabs.
  const order = useMemo(
    () => sectionsForRole(user?.role).flatMap((s) => s.links.map((l) => l.to)),
    [user?.role]
  );
  const indexOf = (path) => order.findIndex((to) => path === to || path.startsWith(`${to}/`));

  const nav = useRef({ path: location.pathname, idx: indexOf(location.pathname), dir: 'up' });
  if (nav.current.path !== location.pathname) {
    const idx = indexOf(location.pathname);
    const previous = nav.current.idx;
    nav.current = {
      path: location.pathname,
      idx,
      dir: idx === -1 || previous === -1 || idx === previous ? 'up' : idx > previous ? 'right' : 'left',
    };
  }

  return (
    <div className="min-h-screen flex flex-col app-backdrop">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-3 focus:py-2 focus:bg-white focus:rounded-lg focus:shadow-lg focus:text-sm"
      >
        Skip to main content
      </a>

      {/* Restarts on every page change, so a bar runs across the top each time a page opens */}
      <div key={`bar-${location.pathname}`} className="route-progress" aria-hidden="true" />

      <TopBar />

      {/* Slowly drifting colour washes behind the page */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="bg-blob bg-blob-a -top-40 -left-32 w-[34rem] h-[34rem]" style={{ background: 'radial-gradient(closest-side, rgba(16,185,129,0.16), transparent)' }} />
        <div className="bg-blob bg-blob-b top-1/3 -right-40 w-[38rem] h-[38rem]" style={{ background: 'radial-gradient(closest-side, rgba(99,102,241,0.14), transparent)' }} />
        <div className="bg-blob bg-blob-c -bottom-48 left-1/4 w-[36rem] h-[36rem]" style={{ background: 'radial-gradient(closest-side, rgba(20,184,166,0.13), transparent)' }} />
      </div>

      <main id="main-content" className="relative flex-1 p-4 sm:p-6 lg:p-8 max-w-[1500px] w-full mx-auto overflow-x-clip">
        {/* The key makes each page a fresh element, so it plays its entrance and a crash on one page does not follow you to the next */}
        <div key={location.pathname} className={`page-enter page-enter-${nav.current.dir}`} data-direction={nav.current.dir}>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
