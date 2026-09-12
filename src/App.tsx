import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './lib/store';
import { Shell } from './components/Shell';
import { Discover } from './pages/Discover';
import { lazyRoute } from './lib/lazy-route';

// Discovery is the landing page and stays in the entry chunk. Everything a
// visitor reaches later is fetched when they go there.
const RideDetail = lazyRoute(() => import('./pages/RideDetail'), 'RideDetail');
const Saved = lazyRoute(() => import('./pages/Collections'), 'Saved');
const Compare = lazyRoute(() => import('./pages/Collections'), 'Compare');
const Trips = lazyRoute(() => import('./pages/Collections'), 'Trips');
const Planner = lazyRoute(() => import('./pages/Planner'), 'Planner');
const NotFound = lazyRoute(() => import('./pages/NotFound'), 'NotFound');

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
