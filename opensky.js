const KM_PER_LAT = 111;

let g_next_fetch_time = 0;

// -

function print() {
   const args = ['[opensky]'].concat([].slice.call(arguments));
   console.log(...args);
}

function encode_url_dict(obj) {
   let kvs = [];
   for (const k in obj) {
      const v = obj[k];
      const kv = encodeURIComponent(k) + '=' + encodeURIComponent(v)
      kvs.push(kv);
   }
   return kvs.join('&');
}

function remap_keys(obj, mapping) {
   const ret = {};
   for (const i in mapping) {
      const k = mapping[i];
      ret[k] = obj[i];
   }
   return ret;
}

// -

const REMAP_OPENSKY_STATES = [
   'icao', // icao24
   'callsign',
   'origin_country',
   'time_position',
   'last_contact',
   'longitude',
   'latitude',
   'baro_altitude_m',
   'on_ground',
   'velocity_m_s',
   'true_track', // Deg clockwise of N
   'vertical_rate_m_s',
   'sensors',
   'geo_altitude_m',
   'squawk',
   'spi',
   'position_source',
];

// -

export async function fetchRect(box_deg) {
   if (box_deg.right - box_deg.left > 1 ||
       box_deg.top - box_deg.bottom > 1) {
      print('box_deg too large:', JSON.stringify(box_deg));
      return null;
   }

   const now = performance.now();
   if (now < g_next_fetch_time) {
      print('Rate-limiting for another', g_next_fetct_time - now + 'ms');
      return null;
   }
   g_next_fetch_time = now + 3000;

   // Example query with bounding box covering Switzerland:
   // https://opensky-network.org/api/states/all?lamin=45.8389&lomin=5.9962&lamax=47.8229&lomax=10.5226
   const lola_box = {
      lomin: box_deg.left,
      lomax: box_deg.right,
      lamin: box_deg.bottom,
      lamax: box_deg.top,
   };
   const query = encode_url_dict(lola_box);
   const url = 'https://opensky-network.org/api/states/all?' + query;
   print(url);

   const response = await fetch(url);
   if (!response.ok) {
      print('response.status:', response.status, response.statusText);
      return null;
   }
   const j = await response.json();

   const arr = j.states.map(x => {
      return remap_keys(x, REMAP_OPENSKY_STATES);
   });
   return arr;
}

// -

export async function fetchAround(geolocation, radius_km) {
   if (!geolocation)
      return null;

   const radius_deg = radius_km / KM_PER_LAT;
   const box_deg = {
      left  : geolocation.coords.longitude - radius_deg,
      right : geolocation.coords.longitude + radius_deg,
      bottom: geolocation.coords.latitude - radius_deg,
      top   : geolocation.coords.latitude + radius_deg,
   };
   return fetchRect(box_deg);
}
