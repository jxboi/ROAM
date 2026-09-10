import { describe, expect, it } from 'vitest';
import { rides, dailyCost } from '../data/rides';
import { addDays, createTrip, defaultFilters, filterRides, formatMonth, planCalendar, planMarkdown, tripBudget } from './planning';

describe('ride discovery',()=>{
 it('combines destination, season, difficulty and budget rather than ignoring constraints',()=>{
  expect(filterRides(rides,{...defaultFilters,query:'  asia ',month:'10',difficulty:'Challenging',budget:'100'}).map(r=>r.id)).toEqual(['ha-giang']);
  expect(filterRides(rides,{...defaultFilters,query:'Italy',month:'1'})).toEqual([]);
 });
 it('supports multiword destinations and duration brackets',()=>{
  expect(filterRides(rides,{...defaultFilters,query:'south island'}).map(r=>r.id)).toEqual(['south-island']);
  expect(filterRides(rides,{...defaultFilters,duration:'short'}).every(r=>r.days<=4)).toBe(true);
  expect(filterRides(rides,{...defaultFilters,duration:'week'}).every(r=>r.days>=5&&r.days<=7)).toBe(true);
  expect(filterRides(rides,{...defaultFilters,duration:'long'}).map(r=>r.id)).toEqual(['patagonia']);
 });
 it('sorts the filtered results without changing the original editorial order',()=>{
  const original=rides.map(r=>r.id);
  const results=filterRides(rides,{...defaultFilters,sort:'budget'});
  expect(results[0].id).toBe('ha-giang');
  expect(results.map(dailyCost)).toEqual(results.map(dailyCost).sort((a,b)=>a-b));
  expect(rides.map(r=>r.id)).toEqual(original);
 });
});
describe('trip budget',()=>{
 it('uses nights for lodging and includes a 10% buffer',()=>{
  const budget=tripBudget(createTrip(rides[0]));
  expect(budget.parts).toEqual({bike:510,stay:375,food:210,fuel:90,extras:60});
  expect(budget).toMatchObject({days:6,nights:5,subtotal:1245,buffer:125,total:1370});
 });
 it('counts rental and food on rest days but not fuel, and scales by riders',()=>{
  const trip=createTrip(rides[0]);
  trip.riders=2;
  trip.days.splice(1,0,{id:'rest',title:'A slow day',description:'Rest',km:0,stay:'Ortisei',notes:'',rest:true});
  expect(tripBudget(trip).parts).toEqual({bike:1190,stay:900,food:490,fuel:180,extras:140});
  trip.ownBike=true;
  expect(tripBudget(trip)).toMatchObject({total:1881,subtotal:1710,buffer:171});
 });
 it('does not charge an overnight stay for a one-day plan',()=>{
  const trip=createTrip(rides[0]);trip.days=trip.days.slice(0,1);
  expect(tripBudget(trip).nights).toBe(0);
  expect(tripBudget(trip).parts.stay).toBe(0);
 });
 it('keeps edits independent from the route template and other trips',()=>{
  const trip=createTrip(rides[0]),other=createTrip(rides[0]);
  trip.costs.stay=1;trip.days[0].notes='My stop';
  expect(rides[0].costs.stay).toBe(75);expect(other.costs.stay).toBe(75);expect(other.days[0].notes).toBe('');
  expect(trip.id).not.toBe(other.id);expect(trip.days[0].id).not.toBe(other.days[0].id);
 });
});
describe('calendar dates and exports',()=>{
 it('crosses month, year and leap-day boundaries without timezone drift',()=>{
  expect(addDays('2027-12-31',1)).toBe('2028-01-01');
  expect(addDays('2028-02-28',1)).toBe('2028-02-29');
  expect(addDays('2027-02-28',1)).toBe('2027-03-01');
  expect(addDays('2027-03-13',2)).toBe('2027-03-15');
  expect(addDays('',1)).toBe('');expect(addDays('not-a-date',1)).toBe('');
 });
 it('exports one all-day event per day with an exclusive end date',()=>{
  const trip=createTrip(rides[0]);trip.startDate='2027-12-30';trip.days=trip.days.slice(0,3);
  const calendar=planCalendar(trip);
  expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  expect(calendar).toContain('DTSTART;VALUE=DATE:20280101\r\nDTEND;VALUE=DATE:20280102');
  expect(calendar).toContain('CALSCALE:GREGORIAN');
  expect(planCalendar({...trip,startDate:''})).toBe('');
 });
 it('escapes notes in calendar files and includes the complete plan in text exports',()=>{
  const trip=createTrip(rides[0]);trip.startDate='2027-06-15';trip.days[0].notes='Espresso, then fuel; bring cash\nAsk about parking';trip.checklist=['gear'];trip.notes='Flight arrives Monday.';
  const calendar=planCalendar(trip),markdown=planMarkdown(trip,rides[0]);
  expect(calendar).toContain('Espresso\\, then fuel\\; bring cash\\nAsk about parking');
  expect(markdown).toContain('Flight arrives Monday.');expect(markdown).toContain('- [x] Check riding gear & repair kit');
  expect(markdown).toContain('10% buffer: $125');expect(markdown).toContain(rides[0].source.url);
 });
});
describe('editorial data integrity',()=>{
 it('has internally consistent day counts, distances and valid season values',()=>{
  expect(new Set(rides.map(r=>r.id)).size).toBe(rides.length);
  expect(new Set(rides.map(r=>r.region)).size).toBe(6);
  for(const ride of rides){expect(ride.days,ride.id).toBe(ride.itinerary.length);expect(ride.distance,ride.id).toBe(ride.itinerary.reduce((sum,d)=>sum+d.km,0));expect(ride.months.every(m=>Number.isInteger(m)&&m>=1&&m<=12)).toBe(true);expect(ride.source.url).toMatch(/^https:\/\//);expect(ride.source.checked,ride.id).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);expect(formatMonth(ride.source.checked),ride.id).not.toBe('');}
 });
});

describe('reference dates',()=>{
 it('renders the month a destination reference was last checked',()=>{
  expect(formatMonth('2026-09')).toBe('September 2026');
  expect(formatMonth('2027-01')).toBe('January 2027');
 });
 it('says nothing rather than something wrong when the stamp is unusable',()=>{
  expect(formatMonth('')).toBe('');
  expect(formatMonth('September 2026')).toBe('');
  expect(formatMonth('2026-13')).toBe('');
 });
});
