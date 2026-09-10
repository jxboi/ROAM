import { lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './lib/store';
import { Shell } from './components/Shell';
import { Discover } from './pages/Discover';

// Discovery is the landing page and stays in the entry chunk. Everything a
// visitor reaches later is fetched when they go there.
const RideDetail = lazy(() => import('./pages/RideDetail').then(m => ({ default: m.RideDetail })));
const Saved = lazy(() => import('./pages/Collections').then(m => ({ default: m.Saved })));
const Compare = lazy(() => import('./pages/Collections').then(m => ({ default: m.Compare })));
const Trips = lazy(() => import('./pages/Collections').then(m => ({ default: m.Trips })));
const Planner = lazy(() => import('./pages/Planner').then(m => ({ default: m.Planner })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

/**
 * Opening a ride is the next thing almost every visitor does, so fetch that
 * chunk once the browser is otherwise idle. The navigation then feels the same
 * as it did before the split.
 */
function usePrefetchRideDetail() {
  useEffect(() => {
    const warm = () => { void import('./pages/RideDetail'); };
    const idle = window.requestIdleCallback;
    if (typeof idle === 'function') {
      const handle = idle(warm, { timeout: 3000 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = setTimeout(warm, 1500);
    return () => clearTimeout(timer);
  }, []);
}

export default function App() {
  usePrefetchRideDetail();
  return (
    <BrowserRouter>
      <StoreProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Discover />} />
            <Route path="ride/:id" element={<RideDetail />} />
            <Route path="saved" element={<Saved />} />
            <Route path="compare" element={<Compare />} />
            <Route path="trips" element={<Trips />} />
            <Route path="trips/:id" element={<Planner />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  );
}
