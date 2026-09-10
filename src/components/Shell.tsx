import { useState, useEffect, useRef, Suspense, type ChangeEvent } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { Compass, Heart, Map, UserRound, X, Check, GitCompareArrows, ArrowUpRight, Download, Upload, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store-context';
import { Logo, Modal, Arrow, RouteFallback } from './ui';
import { ErrorBoundary } from './ErrorBoundary';
import { useRouteAnnouncement } from '../lib/meta';
import { useServiceWorker } from '../lib/service-worker';
import { downloadFile } from '../lib/planning';
import { backupFilename, createBackup, describeRestore, readBackup } from '../lib/backup';
export function Shell(){
 const {saved,compare,trips,clearCompare,restore,clearEverything,notify,toast,storageError}=useStore();const location=useLocation();const [profile,setProfile]=useState(false),[confirmClear,setConfirmClear]=useState(false);
 const currentPage=useRouteAnnouncement();
 const {updateReady,applyUpdate}=useServiceWorker();
 const mainRef=useRef<HTMLElement>(null);
 const firstView=useRef(true);
 const [navigated,setNavigated]=useState(false);
 useEffect(()=>{
  window.scrollTo(0,0);
  // The first page needs neither: the browser announces it and focus is already
  // at the top. Every later route change leaves focus behind in the header, and
  // is silent unless the live region says something.
  if(firstView.current){firstView.current=false;return;}
  setNavigated(true);
  mainRef.current?.focus();
 },[location.pathname]);
 const stored=saved.length+trips.length;
 const downloadBackup=()=>{downloadFile(backupFilename(),createBackup({saved,compare,trips}),'application/json');notify('Backup downloaded. Keep it somewhere safe.');};
 const restoreBackup=async(event:ChangeEvent<HTMLInputElement>)=>{
  const file=event.target.files?.[0];
  event.target.value='';
  if(!file)return;
  // A ROAM backup is a small JSON file; anything larger is the wrong file.
  if(file.size>5_000_000){notify('That file is too large to be a ROAM backup.');return;}
  try{
   const incoming=readBackup(await file.text());
   if(!incoming){notify('That doesn’t look like a ROAM backup.');return;}
   notify(describeRestore(restore(incoming)));
  }catch{notify('That backup couldn’t be read.');}
 };
 const nav=[{to:'/',label:'Explore',mobile:'Explore',icon:Compass},{to:'/saved',label:'Saved rides',mobile:'Saved',icon:Heart},{to:'/trips',label:'My trips',mobile:'My trips',icon:Map}];
 const inPlanner=location.pathname.startsWith('/trips/');
 return <><a className="skip-link" href="#main">Skip to content</a><div id="route-announcer" className="sr-only" role="status" aria-live="polite">{navigated&&currentPage?`${currentPage}, page loaded`:''}</div><header className="site-header"><div className="header-inner"><Link to="/" aria-label="ROAM home"><Logo/></Link><nav className="desktop-nav" aria-label="Main navigation">{nav.map(item=><NavLink key={item.to} to={item.to} end={item.to==='/'}>{item.label}{item.to==='/saved'&&saved.length>0&&<span className="nav-count">{saved.length}</span>}</NavLink>)}</nav><button className="profile-button" onClick={()=>setProfile(true)} aria-label="Your travel space"><UserRound size={19}/></button></div></header>{updateReady&&<div className="update-banner" role="status"><span>A newer version of ROAM is ready.</span><button className="text-button" onClick={applyUpdate}>Refresh now</button></div>}{storageError&&<div className="storage-warning" role="alert">Your browser couldn’t save these changes. Keep this page open and export your trip to keep a copy.</div>}<main id="main" ref={mainRef} tabIndex={-1}><ErrorBoundary resetKey={location.pathname}><Suspense fallback={<RouteFallback/>}><Outlet/></Suspense></ErrorBoundary></main><footer className="site-footer"><div className="container footer-inner"><Link to="/" aria-label="ROAM home"><Logo/></Link><p>For the joy of the journey.</p><button className="text-button" onClick={()=>setProfile(true)}>About ROAM <ArrowUpRight size={15}/></button></div><p className="footer-note container">Routes and budgets are planning estimates. Destination imagery is AI-created for inspiration.</p></footer><nav className="mobile-nav" aria-label="Mobile navigation">{nav.map(item=><NavLink key={item.to} to={item.to} end={item.to==='/'}><span className="mobile-nav-icon"><item.icon size={22}/>{item.to==='/saved'&&saved.length>0&&<i>{saved.length}</i>}</span>{item.mobile}</NavLink>)}</nav>{compare.length>0&&location.pathname!=='/compare'&&!inPlanner&&<div className="compare-tray"><GitCompareArrows size={20}/><span><b>{compare.length} ride{compare.length!==1?'s':''}</b> to compare</span><Link to="/compare" className="button primary compact">Compare <Arrow size={18}/></Link><button className="icon-button" aria-label="Clear comparison" onClick={clearCompare}><X size={18}/></button></div>}<div className={`toast ${toast?'visible':''}`} role="status" aria-live="polite">{toast&&<><Check size={18}/><span>{toast}</span></>}</div><Modal open={profile} onClose={()=>{setProfile(false);setConfirmClear(false);}} title="Your little corner of the world"><div className="about-art"><Logo/><span>Good roads ahead.</span></div><p>ROAM is a place to find extraordinary motorcycle rides and turn “one day” into a plan.</p><p>Your saved rides and trips stay in this browser. No account needed. Export a trip to keep a copy or share it with your riding friends.</p><div className="data-box"><b>Keep your plans safe</b><p>Nothing here syncs anywhere. Download a backup before you clear your browser data or move to another phone — restoring adds those plans back alongside anything already here.</p><div className="data-actions"><button className="button secondary" onClick={downloadBackup}><Download size={17}/>Download a backup</button><label className="button secondary file-button"><Upload size={17}/>Restore a backup<input type="file" accept="application/json,.json" className="sr-only" onChange={restoreBackup}/></label></div>{stored>0&&(confirmClear?<div className="clear-confirm" role="group" aria-label="Confirm removing your rides and trips"><p>Remove {trips.length} trip{trips.length===1?'':'s'} and {saved.length} saved ride{saved.length===1?'':'s'} from this browser? Only a downloaded backup will be left.</p><div className="data-actions"><button className="button secondary" onClick={()=>setConfirmClear(false)}>Keep them</button><button className="button danger-button" onClick={()=>{clearEverything();setConfirmClear(false);}}>Yes, remove them</button></div></div>:<button className="text-button danger clear-data" onClick={()=>setConfirmClear(true)}><Trash2 size={15}/>Remove my rides and trips</button>)}</div><div className="info-box"><b>A little context</b><p>These are curated sample itineraries with approximate distances and editable USD budgets, not live bookings or turn-by-turn routes. Check local road access and arrange travel directly with providers. Landscape images are AI-created illustrations.</p></div><button className="button primary full" onClick={()=>{setProfile(false);setConfirmClear(false);}}>Let’s explore <Arrow/></button></Modal></>;
}
