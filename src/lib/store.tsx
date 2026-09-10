import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { StoreContext, type State } from './store-context';
import { rideById, type Ride } from '../data/rides';
import { createTrip, type Trip } from './planning';
const KEY='roam-planner-v1';
const EMPTY:State={saved:[],compare:[],trips:[]};
function readState():State {
  try{
    const data=JSON.parse(localStorage.getItem(KEY)||'null');
    if(!data||typeof data!=='object')return EMPTY;
    const ids=(value:unknown)=>Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==='string'&&!!rideById(id)))]:[];
    const trips=Array.isArray(data.trips)?data.trips.filter((trip:Trip)=>trip&&typeof trip.id==='string'&&typeof trip.name==='string'&&!!rideById(trip.rideId)&&Array.isArray(trip.days)&&trip.days.length>0&&trip.days.every(day=>day&&typeof day.id==='string'&&typeof day.title==='string'&&typeof day.notes==='string'&&Number.isFinite(day.km))&&Array.isArray(trip.checklist)&&typeof trip.notes==='string'&&typeof trip.startDate==='string'&&Number.isFinite(trip.riders)&&trip.riders>=1&&trip.riders<=12&&trip.costs&&['bike','stay','food','fuel','extras'].every(key=>Number.isFinite(trip.costs[key as keyof Trip['costs']])&&trip.costs[key as keyof Trip['costs']]>=0)):[];
    return {saved:ids(data.saved),compare:ids(data.compare).slice(0,3),trips};
  }catch{return EMPTY;}
}
export function StoreProvider({children}:{children:ReactNode}) {
  const [state,setState]=useState<State>(readState),[toast,setToast]=useState(''),[storageError,setStorageError]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const notify=useCallback((message:string)=>{setToast(message);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(''),3500);},[]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(state));setStorageError(false);}catch{setStorageError(true);}},[state]);
  const toggleSaved=(id:string)=>{if(!rideById(id))return;const exists=state.saved.includes(id);setState(s=>({...s,saved:s.saved.includes(id)?s.saved.filter(x=>x!==id):[...s.saved,id]}));notify(exists?'Removed from saved rides':'Saved for the roads ahead');};
  const toggleCompare=(id:string)=>{if(!rideById(id))return;if(state.compare.length>=3&&!state.compare.includes(id)){notify('Compare up to 3 rides. Remove one to add another.');return;}setState(s=>({...s,compare:s.compare.includes(id)?s.compare.filter(x=>x!==id):s.compare.length<3?[...s.compare,id]:s.compare}));};
  const newTrip=(ride:Ride)=>{const trip=createTrip(ride);setState(s=>({...s,trips:[trip,...s.trips]}));notify('Your next adventure starts here');return trip.id;};
  const updateTrip=(id:string,update:Partial<Trip>)=>setState(s=>({...s,trips:s.trips.map(trip=>trip.id===id?{...trip,...update,id:trip.id,rideId:trip.rideId,updatedAt:new Date().toISOString()}:trip)}));
  return <StoreContext.Provider value={{...state,toggleSaved,toggleCompare,clearCompare:()=>setState(s=>({...s,compare:[]})),newTrip,updateTrip,deleteTrip:(id)=>{setState(s=>({...s,trips:s.trips.filter(t=>t.id!==id)}));notify('Trip deleted');},notify,toast,storageError}}>{children}</StoreContext.Provider>;
}
