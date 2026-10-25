import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { PageLoader } from '../common/PageLoader';

export function AppShell() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-3 focus:py-2 focus:bg-white focus:rounded-lg focus:shadow-lg focus:text-sm"
      >
        Skip to main content
      </a>
      <TopBar />
      <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1500px] w-full mx-auto">
        {/* key resets the boundary when the user navigates away from a crashed page */}
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
