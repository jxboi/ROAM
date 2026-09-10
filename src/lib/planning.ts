import { dailyCost, type Ride, type Costs } from '../data/rides';
import { uid } from './id';
import { absoluteUrl } from './site';
export type Filters = { query: string; month: string; style: string; duration: string; difficulty: string; budget: string; sort: string };
export const defaultFilters: Filters = {query:'',month:'',style:'',duration:'',difficulty:'',budget:'',sort:'recommended'};
export function filterRides(rides: Ride[], filters: Filters) {
  const words = filters.query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = rides.filter(ride => {
    const haystack = `${ride.name} ${ride.country} ${ride.region} ${ride.start} ${ride.finish} ${ride.styles.join(' ')}`.toLocaleLowerCase();
    return words.every(word => haystack.includes(word)) &&
      (!filters.month || ride.months.includes(Number(filters.month))) &&
      (!filters.style || ride.styles.includes(filters.style as Ride['styles'][number])) &&
      (!filters.duration || (filters.duration === 'short' ? ride.days <= 4 : filters.duration === 'week' ? ride.days >= 5 && ride.days <= 7 : ride.days >= 8)) &&
      (!filters.difficulty || ride.difficulty === filters.difficulty) &&
      (!filters.budget || dailyCost(ride) <= Number(filters.budget));
  });
  return filtered.sort((a,b) => filters.sort === 'budget' ? dailyCost(a)-dailyCost(b) : filters.sort === 'duration' ? a.days-b.days : filters.sort === 'distance' ? a.distance-b.distance : 0);
}
export type PlanDay = { id: string; title: string; description: string; km: number; stay: string; notes: string; rest: boolean };
export type Trip = { id: string; rideId: string; name: string; startDate: string; riders: number; ownBike: boolean; costs: Costs; days: PlanDay[]; checklist: string[]; notes: string; createdAt: string; updatedAt: string };
export const CHECKLIST = [
  {id:'documents',title:'Confirm licence & travel documents',text:'Check the requirements for your nationality, licence and bike class.'},
  {id:'insurance',title:'Arrange motorcycle & travel insurance',text:'Confirm the activities, engine size and roads are covered.'},
  {id:'motorcycle',title:'Book the bike or prepare your own',text:'Confirm pickup, return, luggage and any one-way fees.'},
  {id:'stays',title:'Book the first and last night',text:'Ask about secure motorcycle parking and arrival times.'},
  {id:'gear',title:'Check riding gear & repair kit',text:'Helmet, layers, waterproofs, gloves and tools suited to your bike.'},
  {id:'offline',title:'Download maps & key details',text:'Keep booking details and emergency contacts available offline.'},
  {id:'conditions',title:'Check road conditions & weather',text:'Review closures and the forecast close to departure.'},
  {id:'contacts',title:'Share your plan with someone',text:'Let someone know your route and when to expect an update.'},
];
export function createTrip(ride: Ride): Trip {
  const now = new Date().toISOString();
  return {id:uid(),rideId:ride.id,name:`My ${ride.name.replace(/^The /,'')} ride`,startDate:'',riders:1,ownBike:false,costs:{...ride.costs},days:ride.itinerary.map(day=>({id:uid(),title:day.title,description:day.description,km:day.km,stay:day.stay,notes:'',rest:false})),checklist:[],notes:'',createdAt:now,updatedAt:now};
}
export function tripBudget(trip: Pick<Trip,'days'|'costs'|'ownBike'|'riders'>) {
  const days = trip.days.length, nights = Math.max(0,days-1), ridingDays = trip.days.filter(day=>!day.rest).length;
  const parts = {
    bike:trip.ownBike ? 0 : trip.costs.bike*days*trip.riders,
    stay:trip.costs.stay*nights*trip.riders,
    food:trip.costs.food*days*trip.riders,
    fuel:trip.costs.fuel*ridingDays*trip.riders,
    extras:trip.costs.extras*days*trip.riders,
  };
  const subtotal=Object.values(parts).reduce((sum,cost)=>sum+cost,0), buffer=Math.round(subtotal*.1);
  return {parts,subtotal,buffer,total:subtotal+buffer,days,nights};
}
export const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
export function addDays(date: string, amount: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const parsed=new Date(`${date}T12:00:00Z`);
  if(!Number.isFinite(parsed.getTime()))return '';
  parsed.setUTCDate(parsed.getUTCDate()+amount);
  return parsed.toISOString().slice(0,10);
}
export function formatDate(date:string,short=false) {
  if(!date)return 'Dates to decide';
  const parsed=new Date(`${date}T12:00:00Z`);
  if(!Number.isFinite(parsed.getTime()))return 'Dates to decide';
  return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:short?'short':'long',...(short?{}:{year:'numeric'}),timeZone:'UTC'}).format(parsed);
}
/** Renders a YYYY-MM reference-check stamp as a month a reader recognises. */
export function formatMonth(value:string) {
  if(!/^\d{4}-\d{2}$/.test(value))return '';
  const parsed=new Date(`${value}-01T12:00:00Z`);
  if(!Number.isFinite(parsed.getTime()))return '';
  return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(parsed);
}
export function downloadFile(name:string,content:string,type='text/plain') {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const link=document.createElement('a');link.href=url;link.download=name;link.rel='noopener';document.body.append(link);link.click();
  // Safari can cancel a download whose anchor is removed in the same tick, so
  // the element and its object URL are both cleaned up afterwards.
  setTimeout(()=>{link.remove();URL.revokeObjectURL(url);},1000);
}
export function planMarkdown(trip:Trip,ride:Ride) {
  const budget=tripBudget(trip);
  return `# ${trip.name}\n\n${ride.country} · ${trip.days.length} days · ${trip.days.reduce((sum,d)=>sum+d.km,0)} km approx.\n${trip.startDate ? `${formatDate(trip.startDate)} – ${formatDate(addDays(trip.startDate,trip.days.length-1))}` : 'Dates to decide'}\n${trip.riders} rider(s) · ${trip.ownBike?'Own motorcycle':'Rental motorcycle'}\n\n## Itinerary\n\n${trip.days.map((day,i)=>`### Day ${i+1}${trip.startDate?` · ${formatDate(addDays(trip.startDate,i),true)}`:''}: ${day.title}\n${day.km} km approx. · Overnight: ${day.stay}\n${day.description}${day.notes?`\nNotes: ${day.notes}`:''}`).join('\n\n')}\n\n## Estimated budget (USD, all riders)\n\n${Object.entries(budget.parts).map(([key,value])=>`${key}: ${money(value)}`).join('\n')}\n10% buffer: ${money(budget.buffer)}\nTotal estimate: ${money(budget.total)}\nAccommodation assumes ${budget.nights} nights and a separate room per rider. Flights, visas, insurance, deposits and one-way fees are excluded. These are editable planning estimates, not live quotes.\n\n## Preparation\n\n${CHECKLIST.map(item=>`- [${trip.checklist.includes(item.id)?'x':' '}] ${item.title}`).join('\n')}\n\n## Notes\n\n${trip.notes||'No notes yet.'}\n\n## Route reference\n\n${ride.name} on ROAM: ${absoluteUrl(`/ride/${ride.id}`)}\n${ride.source.name}: ${ride.source.url}${ride.source.checked?` (reference checked ${formatMonth(ride.source.checked)})`:''}\n\nROAM sample itinerary. Distances and daily routes are approximate planning suggestions, not verified navigation. Check current local access, conditions, documents and provider terms before travel.\n`;
}
function icsEscape(value:unknown){return String(value??'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
/** An unparseable stored timestamp must not take the whole export down. */
function icsStamp(value:string){
  const parsed=new Date(value);
  const date=Number.isFinite(parsed.getTime())?parsed:new Date();
  return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
}
/**
 * RFC 5545 caps a content line at 75 octets and continues it on the next line
 * behind a single space. A day's description easily runs past that, and strict
 * calendar parsers reject the file rather than guessing.
 */
function foldIcsLine(line:string) {
  const encoder=new TextEncoder();
  if(encoder.encode(line).length<=75)return line;
  const parts:string[]=[];
  let current='',bytes=0,limit=75;
  for(const character of line){
    const size=encoder.encode(character).length;
    if(bytes+size>limit){parts.push(current);current='';bytes=0;limit=74;}
    current+=character;bytes+=size;
  }
  if(current)parts.push(current);
  return parts.join('\r\n ');
}
export function planCalendar(trip:Trip) {
  if(!trip.startDate)return '';
  const title=icsEscape(trip.name);
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ROAM//Trip Planner//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',`NAME:${title}`,`X-WR-CALNAME:${title}`,...trip.days.flatMap((day,i)=>['BEGIN:VEVENT',`UID:${trip.id}-${day.id}@roam.local`,`DTSTAMP:${icsStamp(trip.updatedAt)}`,`DTSTART;VALUE=DATE:${addDays(trip.startDate,i).replace(/-/g,'')}`,`DTEND;VALUE=DATE:${addDays(trip.startDate,i+1).replace(/-/g,'')}`,`SUMMARY:${icsEscape(`Day ${i+1}: ${day.title}`)}`,`DESCRIPTION:${icsEscape(`${day.description}\n${day.notes}\n${day.km} km approx.`)}`,`LOCATION:${icsEscape(day.stay)}`,'END:VEVENT']),'END:VCALENDAR'];
  return lines.map(foldIcsLine).join('\r\n');
}
