import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowRight, X, Compass, CalendarDays, Route, Mountain } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Ride } from '../data/rides';
export function Logo(){return <span className="logo"><svg viewBox="0 0 46 42" fill="currentColor" aria-hidden="true"><path d="M13 1c46 6 14 16 8 22-8 7 6 11 17 18H8C-10 27 23 22 29 14S17 6 13 1Z"/><path d="M18 5c28 5 3 14 1 19-5 6 2 10 9 14" fill="none" stroke="var(--bg)" strokeWidth="1.1" strokeDasharray="4 3"/></svg>ROAM<span className="logo-dot">.</span></span>}
export function Arrow({size=20}:{size?:number}){return <ArrowRight size={size} className="arrow" aria-hidden="true"/>}
export function RideStats({ride}:{ride:Pick<Ride,'days'|'distance'|'difficulty'>}){return <div className="ride-stats"><span><CalendarDays/>{ride.days} days</span><span><Route/>{ride.distance.toLocaleString()} km</span><span><Mountain/>{ride.difficulty}</span></div>}
export function Modal({open,onClose,title,children,className=''}:{open:boolean;onClose:()=>void;title:string;children:ReactNode;className?:string}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;if(!dialog)return;if(open&&!dialog.open)dialog.showModal();else if(!open&&dialog.open)dialog.close();if(open){const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};}},[open]);
  return <dialog ref={ref} className={`modal ${className}`} onCancel={onClose} onClick={event=>{if(event.target===event.currentTarget){const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose();}}} aria-label={title}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X/></button></div>{children}</dialog>;
}
export function EmptyState({title,description,action='Explore the rides',to='/',icon,children}:{title:string;description:string;action?:string;to?:string;icon?:ReactNode;children?:ReactNode}){return <div className="empty-state"><div className="empty-icon">{icon||<Compass size={34}/>}</div><h2>{title}</h2><p>{description}</p>{children||<Link className="button primary" to={to}>{action}<Arrow/></Link>}</div>}
export function PageHeading({title,description,children}:{title:string;description:string;children?:ReactNode}){return <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{children}</div>}
/** Holds the page's place while a lazily loaded route arrives. */
export function RouteFallback(){return <div className="route-fallback" role="status" aria-live="polite"><span className="sr-only">Loading</span><span className="route-fallback-bar"/><span className="route-fallback-bar short"/></div>}
export function Note({children}:{children:ReactNode}){return <p className="fine-print">{children}</p>}
