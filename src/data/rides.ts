export type RideStyle = 'Mountain passes' | 'Coastal roads' | 'Off the beaten path' | 'Weekend escapes';
export type Difficulty = 'Easygoing' | 'Moderate' | 'Challenging';
export type Day = { title: string; description: string; km: number; stay: string; highlight: string };
export type Costs = { bike: number; stay: number; food: number; fuel: number; extras: number };
export type Ride = {
  id: string; name: string; country: string; region: string; image: string; tagline: string; short: string;
  description: string; days: number; distance: number; difficulty: Difficulty; styles: RideStyle[];
  months: number[]; season: string; road: string; start: string; finish: string; bike: string;
  costs: Costs; highlights: string[]; practical: {title:string; text:string}[]; itinerary: Day[];
  source: {name:string; url:string};
};
export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const STYLES: RideStyle[] = ['Mountain passes','Coastal roads','Off the beaten path','Weekend escapes'];
export const REGIONS = ['Europe','Asia','Africa','Oceania','North America','South America'];
export const rides: Ride[] = [
  {
    id:'dolomites', name:'The Dolomites', country:'Italy', region:'Europe', image:'dolomites',
    tagline:'A different kind of rush hour.', short:'Dramatic peaks, endless switchbacks, pure riding bliss.',
    description:'Some roads are simply a way to get there. These are the reason to go. Spend six unhurried days beneath limestone peaks, linking spectacular passes with alpine villages and long espresso stops. Base yourself in the valleys and leave room for the road that catches your eye.',
    days:6, distance:750, difficulty:'Moderate', styles:['Mountain passes'], months:[6,7,8,9], season:'June–September', road:'Paved mountain roads', start:'Bolzano', finish:'Bolzano', bike:'Adventure or touring',
    costs:{bike:85,stay:75,food:35,fuel:15,extras:10}, highlights:['The four passes of the Sella Ronda','Golden-hour views at Passo Giau','Alpine villages and mountain cafés'],
    practical:[{title:'Make room for the weather',text:'High passes can have cold rain even in summer. Check the current pass status before each riding day and keep a valley alternative in mind.'},{title:'Ride early, stop often',text:'Popular passes get busy. Start with a quiet morning ride, use designated viewpoints for photos, and leave generous space for cyclists and buses.'},{title:'Getting there',text:'Use Bolzano as your starting base. Confirm motorcycle availability, luggage storage, and pickup hours directly with a local rental provider.'}],
    itinerary:[
      {title:'Bolzano → Val Gardena',description:'Settle into the bike, wind through the valley and make your first mountain café stop. Keep the first day gentle.',km:90,stay:'Ortisei',highlight:'Your first view of the Sella massif'},
      {title:'The Sella Ronda passes',description:'A day for Gardena, Campolongo, Pordoi and Sella. Make a slow loop with plenty of time at the viewpoints.',km:120,stay:'Ortisei',highlight:'Four passes, one unforgettable loop'},
      {title:'Val Gardena → Cortina',description:'Cross toward Alta Badia and the Falzarego area before rolling into Cortina for the evening.',km:130,stay:'Cortina d’Ampezzo',highlight:'Rock towers above Falzarego'},
      {title:'Passo Giau and the valleys',description:'Explore Passo Giau and the surrounding valleys. Choose a longer café stop over another rushed pass.',km:140,stay:'Cortina d’Ampezzo',highlight:'The sweeping bends of Passo Giau'},
      {title:'Cortina → Val di Fassa',description:'Follow a scenic return west through small mountain towns. Take a little extra time for the stops you missed.',km:150,stay:'Canazei',highlight:'A long lunch in an alpine village'},
      {title:'Val di Fassa → Bolzano',description:'Return through the mountains and into the valley, leaving time to refuel and return the bike.',km:120,stay:'Bolzano',highlight:'One last mountain espresso'}
    ],source:{name:'South Tyrol · mountain passes',url:'https://www.suedtirol.info/en/en/information/mobility/mountain-passes-in-south-tyrol'}
  },
  {
    id:'ha-giang',name:'Ha Giang Loop',country:'Vietnam',region:'Asia',image:'vietnam',tagline:'Take the long way into another world.',short:'Limestone peaks, village life and unforgettable roads.',
    description:'A compact adventure with an enormous sense of place. The road rises into a landscape of limestone towers, deep valleys and hillside villages. Ride at a thoughtful pace, stay in locally run guesthouses, and make the time between destinations part of the trip.',
    days:4,distance:350,difficulty:'Challenging',styles:['Mountain passes','Off the beaten path'],months:[3,4,5,9,10,11],season:'March–May · September–November',road:'Paved, with rough sections',start:'Ha Giang',finish:'Ha Giang',bike:'Lightweight motorcycle',
    costs:{bike:18,stay:20,food:15,fuel:5,extras:7},highlights:['The limestone landscapes of Đồng Văn','The views around Mã Pí Lèng','Small villages and local homestays'],
    practical:[{title:'Choose the right way to ride',text:'Tight bends, steep roads and variable surfaces suit confident, experienced riders. A reputable local guided or passenger ride is another way to experience the loop.'},{title:'Plan beyond the distance',text:'Short distances can take a long time here. Keep daylight in reserve and check road conditions locally after heavy rain.'},{title:'Confirm your documents',text:'Before booking, verify current motorcycle licence recognition and insurance cover for your licence, nationality and bike class with the relevant authorities and provider.'}],
    itinerary:[
      {title:'Ha Giang → Yen Minh',description:'Climb into the limestone country with breaks around Quan Ba. Take the first day slowly as you learn the roads.',km:100,stay:'Yen Minh',highlight:'The views around Heaven’s Gate'},
      {title:'Yen Minh → Dong Van',description:'Continue through the geopark, allowing time for village stops and a relaxed arrival in Dong Van.',km:70,stay:'Dong Van',highlight:'Limestone peaks and an old town stroll'},
      {title:'Dong Van → Du Gia',description:'Ride the spectacular Ma Pi Leng area before continuing toward a quieter overnight stop.',km:100,stay:'Du Gia',highlight:'A dramatic view above the Nho Que valley'},
      {title:'Du Gia → Ha Giang',description:'Enjoy a slow morning, then take a locally verified return route to Ha Giang before dark.',km:80,stay:'Ha Giang',highlight:'A final stretch through green valleys'}
    ],source:{name:'Vietnam Tourism · Ha Giang Loop',url:'https://www.vietnam.travel/things-to-do/ha-giang-loop'}
  },
  {
    id:'atlas',name:'Atlas Mountains',country:'Morocco',region:'Africa',image:'morocco',tagline:'A little further from the everyday.',short:'Ancient roads, vivid culture and mountain views.',
    description:'Trade the city bustle for mountain air, terracotta valleys and roads that unfold one bend at a time. This paved-road adventure links Marrakech with the landscapes around Ouarzazate and the Dadès Valley, with space for mint tea and quiet afternoons.',
    days:6,distance:1000,difficulty:'Moderate',styles:['Mountain passes','Off the beaten path'],months:[3,4,5,9,10,11],season:'March–May · September–November',road:'Mostly paved',start:'Marrakech',finish:'Marrakech',bike:'Adventure or touring',
    costs:{bike:65,stay:45,food:22,fuel:12,extras:11},highlights:['The climb over Tizi n’Tichka','The earthen architecture of Aït Ben Haddou','The colours of the Dadès Valley'],
    practical:[{title:'Let conditions set the pace',text:'Heat, mountain weather and road repairs can change the day. Ask locally about the route and keep time for an alternate road.'},{title:'Keep the tank topped up',text:'Refuel in towns and carry drinking water. Facilities become less frequent away from larger settlements.'},{title:'Arrive with time to spare',text:'Allow a day in Marrakech for your rental handover. Agree which roads and surfaces your rental contract covers.'}],
    itinerary:[
      {title:'Marrakech → Aït Ben Haddou',description:'Cross the mountains and settle into an afternoon among earthen walls and warm desert colours.',km:185,stay:'Aït Ben Haddou',highlight:'Tizi n’Tichka mountain views'},
      {title:'Aït Ben Haddou → Dadès Valley',description:'Head east via Ouarzazate and make time for breaks as the landscape opens up.',km:190,stay:'Boumalne Dadès',highlight:'The changing colours of the valley'},
      {title:'Explore the Dadès Valley',description:'Leave the luggage behind for a relaxed day of mountain roads and long viewpoints.',km:120,stay:'Boumalne Dadès',highlight:'A slow ride through the gorge'},
      {title:'Dadès → Ouarzazate',description:'Turn west for an easy day, stopping at places you passed on the way out.',km:160,stay:'Ouarzazate',highlight:'Small-town cafés and oasis landscapes'},
      {title:'Ouarzazate → Marrakech',description:'Cross back over the Atlas while the day is still cool. Make the most of the morning mountain light.',km:195,stay:'Marrakech',highlight:'One more crossing of the high country'},
      {title:'A gentle Marrakech day ride',description:'Choose a short locally recommended ride or trade the bike for a relaxed city day before return.',km:150,stay:'Marrakech',highlight:'A flexible day to make your own'}
    ],source:{name:'Visit Morocco · nature and adventure',url:'https://www.visitmorocco.com/sites/default/files/atoms/files/Nature%20%26%20Adventure%20ENG.pdf'}
  },
  {
    id:'lofoten',name:'Lofoten Islands',country:'Norway',region:'Europe',image:'norway',tagline:'Follow the road. Lose track of time.',short:'Arctic light, fishing villages and roads beside the sea.',
    description:'Mountains rise straight from the water, bridges leap between islands, and the next tiny fishing village is always worth a stop. Follow the scenic E10 corridor and take your time on detours toward quiet beaches. Four days gives this short route room to breathe.',
    days:4,distance:400,difficulty:'Easygoing',styles:['Coastal roads'],months:[6,7,8],season:'June–August',road:'Paved coastal roads',start:'Svolvær',finish:'Svolvær',bike:'Touring or middleweight',costs:{bike:120,stay:110,food:45,fuel:20,extras:15},
    highlights:['The fishing villages around Reine','White-sand beaches beneath Arctic peaks','Quiet detours off the E10'],
    practical:[{title:'Pack for four seasons',text:'Summer is the starting point for this motorcycle plan, but wind and rain still matter. Bring waterproof layers and check the local forecast.'},{title:'Keep your arrival simple',text:'Confirm where you can collect a motorcycle before arranging travel. A mainland pickup adds substantial distance to this island-only plan.'},{title:'Book small stays ahead',text:'Accommodation can fill in summer. Plan overnight stops, and check ferry times separately if your approach includes a crossing.'}],
    itinerary:[
      {title:'Svolvær → Henningsvær',description:'Start with an easy coastal introduction and an afternoon in the harbour.',km:60,stay:'Henningsvær',highlight:'Bridges and fishing cabins'},
      {title:'Henningsvær → Reine',description:'Follow the island road south with beach and village stops along the way.',km:130,stay:'Reine',highlight:'Mountains above the sea'},
      {title:'Reine → Å and back',description:'Visit the southern end of the road and leave plenty of time for short walks and quiet viewpoints.',km:70,stay:'Reine',highlight:'The village at the end of the road'},
      {title:'Reine → Svolvær',description:'Make an unhurried return with a fresh detour if conditions allow.',km:140,stay:'Svolvær',highlight:'One more beach stop'}
    ],source:{name:'Norwegian Scenic Routes · Lofoten',url:'https://www.nasjonaleturistveger.no/en/routes/lofoten'}
  },
  {
    id:'kyushu',name:'Kyushu Volcano Roads',country:'Japan',region:'Asia',image:'japan',tagline:'Green hills. Hot springs. Happy detours.',short:'Volcanic landscapes with an onsen at the end of the day.',
    description:'A short escape built around the open grasslands of Aso and the roads toward the hot-spring towns of central Kyushu. Easy distances leave time for viewpoints, local lunches and an evening soak. Make the route as relaxed as the destination.',
    days:3,distance:320,difficulty:'Moderate',styles:['Mountain passes','Weekend escapes'],months:[4,5,9,10,11],season:'April–May · September–November',road:'Paved mountain roads',start:'Kumamoto',finish:'Kumamoto',bike:'Middleweight or touring',costs:{bike:70,stay:65,food:30,fuel:10,extras:15},
    highlights:['The open grasslands around Aso','Scenic roads toward Kuju','A quiet evening in a hot-spring town'],
    practical:[{title:'Check volcanic access',text:'Access near active volcanoes can change. Check official local alerts and road information before riding toward a crater area.'},{title:'Arrange your motorcycle first',text:'Confirm rental documents, opening hours and luggage options before your arrival. Leave time for the handover.'},{title:'Leave room for rain',text:'Mountain weather can reduce visibility quickly. Keep your route flexible and use a shorter valley route if needed.'}],
    itinerary:[
      {title:'Kumamoto → Aso',description:'Leave the city behind and spend the afternoon exploring the caldera landscape on open roads.',km:100,stay:'Aso',highlight:'The grasslands around Kusasenri'},
      {title:'Aso → Kurokawa Onsen',description:'Make a scenic loop toward the Kuju area and settle into a hot-spring town for the evening.',km:120,stay:'Kurokawa Onsen',highlight:'A mountain road and an evening soak'},
      {title:'Kurokawa → Kumamoto',description:'Enjoy a leisurely return through the countryside, with a final lunch stop before bike return.',km:100,stay:'Kumamoto',highlight:'A last taste of the Kyushu countryside'}
    ],source:{name:'Japan National Tourism Organization · road trips',url:'https://www.japan.travel/th/th/newsletter/japan-road-trip-driving/'}
  },
  {
    id:'south-island',name:'South Island Escape',country:'New Zealand',region:'Oceania',image:'newzealand',tagline:'Big landscapes. Absolutely no hurry.',short:'Turquoise lakes and the long way to the Southern Alps.',
    description:'A one-way ride from Christchurch to Queenstown through the big skies of the Mackenzie region. Lake stops, mountain views and short walking breaks make the distance feel generous. Keep a spare afternoon for the place you don’t want to leave.',
    days:7,distance:1050,difficulty:'Moderate',styles:['Mountain passes','Off the beaten path'],months:[1,2,3,11,12],season:'November–March',road:'Paved scenic roads',start:'Christchurch',finish:'Queenstown',bike:'Adventure or touring',costs:{bike:95,stay:85,food:35,fuel:18,extras:17},
    highlights:['The blue of Lake Pukaki','Aoraki / Mount Cook mountain views','The lake country around Wānaka'],
    practical:[{title:'Arrange the one-way return',text:'This is a one-way itinerary. Confirm bike drop-off in Queenstown and any relocation fee, or add time for a return ride.'},{title:'Watch the wind and weather',text:'Exposed roads and mountain conditions can make a short distance feel demanding. Build in a flexible day.'},{title:'Keep the day unhurried',text:'Use designated pull-offs for photographs, and leave time for unfamiliar roads and regular breaks.'}],
    itinerary:[
      {title:'Christchurch → Lake Tekapo',description:'Ride out through the plains and into lake country, with plenty of breaks on your first day.',km:230,stay:'Lake Tekapo',highlight:'Your first view of the turquoise water'},
      {title:'Tekapo → Aoraki / Mount Cook',description:'Follow the lakes toward the mountains and arrive with time for a short walk.',km:110,stay:'Mount Cook Village',highlight:'The shore of Lake Pukaki'},
      {title:'Aoraki → Omarama',description:'Enjoy another morning in the mountains before a short afternoon ride south.',km:100,stay:'Omarama',highlight:'An unhurried mountain morning'},
      {title:'Omarama → Wānaka',description:'Cross the Lindis Pass area and descend into another beautiful lakeside town.',km:115,stay:'Wānaka',highlight:'The tawny hills of Lindis Pass'},
      {title:'A Wānaka day ride',description:'Take a relaxed out-and-back toward the lake country or spend a day off the bike.',km:180,stay:'Wānaka',highlight:'A day with no unpacking'},
      {title:'Wānaka → Queenstown',description:'Choose a locally suitable route into Queenstown with time for viewpoints and lunch.',km:130,stay:'Queenstown',highlight:'A new lake around the next bend'},
      {title:'Queenstown and the lake road',description:'Enjoy a final scenic day ride before returning the motorcycle and celebrating the trip.',km:185,stay:'Queenstown',highlight:'A last lakeside ride'}
    ],source:{name:'Tourism New Zealand · road trips',url:'https://www.newzealand.com/ca/feature/road-trips/'}
  },
  {
    id:'blue-ridge',name:'Blue Ridge Parkway',country:'United States',region:'North America',image:'blueridge',tagline:'Let the mountains slow you down.',short:'Soft blue horizons and a thousand shades of autumn.',
    description:'A few days of green tunnels, mountain overlooks and small-town evenings in the Blue Ridge. This sample explores the northern parkway from Waynesboro to Roanoke and back, leaving room for side roads and longer stops. Let current road access shape your final route.',
    days:3,distance:420,difficulty:'Moderate',styles:['Mountain passes','Weekend escapes'],months:[5,6,9,10],season:'May–June · September–October',road:'Paved parkway',start:'Waynesboro, Virginia',finish:'Waynesboro, Virginia',bike:'Touring or cruiser',costs:{bike:95,stay:95,food:40,fuel:15,extras:10},
    highlights:['Layered Blue Ridge overlooks','Quiet stretches beneath the forest canopy','Small-town stops along the way'],
    practical:[{title:'Check parkway closures',text:'Sections can close for repairs or weather. Use the National Park Service’s current road information before planning each day.'},{title:'Treat it as a scenic ride',text:'Narrow shoulders, wildlife and tightening curves need attention. Take photographs only from safe designated stops.'},{title:'Plan fuel off the parkway',text:'Identify fuel and overnight stops in nearby towns in advance. Keep a comfortable reserve.'}],
    itinerary:[
      {title:'Waynesboro → Peaks of Otter',description:'Ease into the parkway with long overlook stops and a relaxed arrival near the mountains.',km:140,stay:'Bedford area',highlight:'Layers of blue hills'},
      {title:'Peaks of Otter → Roanoke',description:'Enjoy a short riding day with time for a walk and a leisurely afternoon in town.',km:100,stay:'Roanoke',highlight:'A slow morning beneath the peaks'},
      {title:'Roanoke → Waynesboro',description:'Return on open scenic roads and revisit your favourite viewpoints in a different light.',km:180,stay:'Waynesboro',highlight:'The best views, one more time'}
    ],source:{name:'National Park Service · motorcycle planning',url:'https://www.nps.gov/blri/planyourvisit/motorcycle-safety.htm'}
  },
  {
    id:'patagonia',name:'Carretera Austral',country:'Chile',region:'South America',image:'patagonia',tagline:'For the part of you that wants to go further.',short:'Glacial lakes, gravel roads and a wilder kind of freedom.',
    description:'An adventure through a section of Chilean Patagonia, from Coyhaique toward Cochrane and back. Gravel, changeable weather and long quiet stretches make this a ride for experienced adventurers. Give the landscape the time it deserves and keep the plan flexible.',
    days:8,distance:1000,difficulty:'Challenging',styles:['Off the beaten path'],months:[1,2,3,12],season:'December–March',road:'Mixed paved and gravel',start:'Coyhaique',finish:'Coyhaique',bike:'Adventure with suitable tyres',costs:{bike:95,stay:65,food:30,fuel:20,extras:15},
    highlights:['The landscape around Cerro Castillo','The vastness of Lago General Carrera','Long, quiet Patagonian roads'],
    practical:[{title:'Be comfortable on gravel',text:'Loose surfaces and exposed stretches can be demanding. Confirm your rental permits the intended roads and choose appropriate tyres.'},{title:'Keep a weather buffer',text:'Wind and rain can change a day’s plans. Carry layers and leave room to wait out poor conditions.'},{title:'Think ahead between towns',text:'Confirm fuel, food and lodging before each stage. Carry a suitable repair kit and arrange an emergency communication plan.'}],
    itinerary:[
      {title:'Coyhaique → Villa Cerro Castillo',description:'Settle into Patagonia with an easy day and mountain views.',km:100,stay:'Villa Cerro Castillo',highlight:'The silhouette of Cerro Castillo'},
      {title:'Cerro Castillo → Puerto Río Tranquilo',description:'Take your time as the road becomes more remote and the lake comes into view.',km:130,stay:'Puerto Río Tranquilo',highlight:'The blue of Lago General Carrera'},
      {title:'A day beside the lake',description:'Leave luggage at your stay and explore nearby open roads, or take a day off the bike.',km:60,stay:'Puerto Río Tranquilo',highlight:'A flexible lake day'},
      {title:'Puerto Río Tranquilo → Cochrane',description:'Continue south with regular stops and a locally checked plan for road conditions.',km:115,stay:'Cochrane',highlight:'Wide river valleys'},
      {title:'Explore around Cochrane',description:'Choose a manageable out-and-back on permitted roads or enjoy an off-bike afternoon.',km:160,stay:'Cochrane',highlight:'A quieter corner of Patagonia'},
      {title:'Cochrane → Puerto Río Tranquilo',description:'Turn north with fresh views of the same extraordinary landscape.',km:115,stay:'Puerto Río Tranquilo',highlight:'The lake in a different light'},
      {title:'Puerto Río Tranquilo → Cerro Castillo',description:'Keep the ride relaxed and stop at the places you passed on the way south.',km:130,stay:'Villa Cerro Castillo',highlight:'A final night in the mountain country'},
      {title:'Cerro Castillo → Coyhaique',description:'Return with room for refuelling, bike handover and a final Patagonian meal.',km:190,stay:'Coyhaique',highlight:'A well-earned finish'}
    ],source:{name:'Chile Travel · Carretera Austral',url:'https://chile.travel/en/destinations/carretera-austral/'}
  }
];
export const rideById = (id: string) => rides.find(ride => ride.id === id);
export const dailyCost = (ride: Ride) => Object.values(ride.costs).reduce((sum,n)=>sum+n,0);
