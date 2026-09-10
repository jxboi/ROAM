import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './lib/store';
import { Shell } from './components/Shell';
import { Discover } from './pages/Discover';
import { RideDetail } from './pages/RideDetail';
import { Saved, Compare, Trips } from './pages/Collections';
import { Planner } from './pages/Planner';
import { NotFound } from './pages/NotFound';
export default function App(){return <BrowserRouter><StoreProvider><Routes><Route element={<Shell/>}><Route index element={<Discover/>}/><Route path="ride/:id" element={<RideDetail/>}/><Route path="saved" element={<Saved/>}/><Route path="compare" element={<Compare/>}/><Route path="trips" element={<Trips/>}/><Route path="trips/:id" element={<Planner/>}/><Route path="*" element={<NotFound/>}/></Route></Routes></StoreProvider></BrowserRouter>}
