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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-3 focus:py-2 focus:bg-white focus:rounded-lg focus:shadow-lg focus:text-sm"
      >
        Skip to main content
      </a>

      {/* Restarts on every page change, so a bar runs across the top each time a page opens */}
      <div key={`bar-${location.pathname}`} className="route-progress" aria-hidden="true" />

      <TopBar />

      <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1500px] w-full mx-auto overflow-x-clip">
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
