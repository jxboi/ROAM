import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './lib/store';
import { Shell } from './components/Shell';
import { Discover } from './pages/Discover';
import { RideDetail } from './pages/RideDetail';
import { Saved, Compare, Trips } from './pages/Collections';
import { Planner } from './pages/Planner';
import { EmptyState } from './components/ui';
export default function App(){return <BrowserRouter><StoreProvider><Routes><Route element={<Shell/>}><Route index element={<Discover/>}/><Route path="ride/:id" element={<RideDetail/>}/><Route path="saved" element={<Saved/>}/><Route path="compare" element={<Compare/>}/><Route path="trips" element={<Trips/>}/><Route path="trips/:id" element={<Planner/>}/><Route path="*" element={<div className="container"><EmptyState title="A little off the beaten path." description="This page doesn’t exist, but your next great ride does."/></div>}/></Route></Routes></StoreProvider></BrowserRouter>}
