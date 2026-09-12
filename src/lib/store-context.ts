import { createContext, useContext } from 'react';
import type { Ride } from '../data/rides';
import type { Trip } from './planning';
import type { RestoreSummary } from './backup';
export type State={saved:string[];compare:string[];trips:Trip[]};
export type Store=State&{toggleSaved:(id:string)=>void;toggleCompare:(id:string)=>void;clearCompare:()=>void;newTrip:(ride:Ride)=>string;updateTrip:(id:string,update:Partial<Trip>)=>void;deleteTrip:(id:string)=>void;restore:(incoming:State)=>RestoreSummary;clearEverything:()=>void;notify:(text:string)=>void;toast:string;storageError:boolean};
export const StoreContext=createContext<Store|null>(null);
export function useStore(){const store=useContext(StoreContext);if(!store)throw new Error('StoreProvider is required');return store;}
