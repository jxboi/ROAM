import { Heart, Check, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dailyCost, type Ride } from '../data/rides';
import { useStore } from '../lib/store-context';
import { money } from '../lib/planning';
import { Arrow, RideStats } from './ui';
export function RideCard({ride,compareMode=false,priority=false}:{ride:Ride;compareMode?:boolean;priority?:boolean}){
 const {saved,toggleSaved,compare,toggleCompare}=useStore();const isSaved=saved.includes(ride.id),isCompared=compare.includes(ride.id);
 return <article className="ride-card"><div className="card-media"><Link to={`/ride/${ride.id}`} tabIndex={-1} aria-hidden="true"><img src={`/images/${ride.image}.webp`} alt={`${ride.name} motorcycle route landscape`} loading={priority?'eager':'lazy'} width="768" height="512"/></Link><button className={`save-button ${isSaved?'saved':''}`} aria-label={`${isSaved?'Unsave':'Save'} ${ride.name}`} aria-pressed={isSaved} onClick={()=>toggleSaved(ride.id)}><Heart size={20} fill={isSaved?'currentColor':'none'}/></button>{compareMode&&<button className={`compare-pick ${isCompared?'selected':''}`} onClick={()=>toggleCompare(ride.id)} aria-pressed={isCompared}>{isCompared?<Check size={16}/>:<Plus size={16}/>}Compare</button>}</div><div className="card-body"><span className="country">{ride.country}</span><h3><Link to={`/ride/${ride.id}`}>{ride.name}</Link></h3><p className="card-description">{ride.short}</p><RideStats ride={ride}/><Link className="card-bottom" to={`/ride/${ride.id}`} aria-label={`View ${ride.name}, estimated ${money(dailyCost(ride))} per day`}><span><span className="estimate">Est.</span> <strong>{money(dailyCost(ride))}</strong> <span>/ day</span></span><Arrow size={22}/></Link></div></article>;
}
