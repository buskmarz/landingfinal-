/* Approved user red outline, snapped to OSM road centerlines on 21 October 2026.
   9 Poniente → 19 Sur → 13 Poniente → 25 Sur; includes intermediate street vertices. */
(()=>{const el=document.getElementById('search-map');if(!el)return;
if(!window.L){el.textContent='No pudimos cargar el mapa. Usa el enlace para llegar a Better Mood.';return;}
const map=L.map(el,{scrollWheelZoom:false,zoomSnap:.25,zoomControl:true,attributionControl:true});
const streets=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,referrerPolicy:'strict-origin-when-cross-origin',attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
const boundary=[[19.0505289,-98.2183484],[19.0505186,-98.2183281],[19.049782,-98.2168829],[19.0497492,-98.2168185],[19.0497387,-98.2167979],[19.0492928,-98.2159231],[19.0490327,-98.2154128],[19.0490148,-98.2153776],[19.0490054,-98.2153592],[19.0486448,-98.2146518],[19.048169,-98.2137184],[19.0474291,-98.2141323],[19.0470228,-98.2143613],[19.04665,-98.2145708],[19.047458,-98.216249],[19.0474733,-98.2162797],[19.0481887,-98.2177002],[19.0486986,-98.2187125],[19.0488117,-98.2189342],[19.048951,-98.2192074],[19.0489617,-98.2192284],[19.049132,-98.2191332],[19.0497872,-98.2187651]];
const zone=L.polygon(boundary,{color:'#ffde00',weight:3,fillColor:'#ffde00',fillOpacity:.16,className:'search-perimeter'}).addTo(map);
const reset=()=>map.fitBounds(zone.getBounds(),{padding:[22,22],animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});reset();
L.circleMarker([19.04859,-98.21655],{radius:7,color:'#231f20',fillColor:'#ffde00',fillOpacity:1}).addTo(map).bindTooltip('UPAEP · Campus central',{direction:'top',permanent:true,className:'map-reference'});
// Venue coordinate corroborated in Restaurant Guru geo metadata, 20 October 2026.
L.marker([19.0483687,-98.2179083],{icon:L.divIcon({className:'mood-map-pin',html:'<img src="/assets/logo-better-mood.png" alt="Better Mood">',iconSize:[48,48],iconAnchor:[24,24]})}).addTo(map).bindTooltip('Better Mood',{direction:'bottom',permanent:true,className:'map-reference'}).bindPopup('<strong>Better Mood</strong><br>Cartón gratis · 13 Poniente 2302<br><a href="https://maps.app.goo.gl/Cx8Rz7zSEPTYzUxr6?g_st=ic" target="_blank" rel="noopener">Cómo llegar ↗</a>');
document.getElementById('map-reset').onclick=reset;
let ready=false;for(const layer of [streets])layer.on('load',()=>{ready=true;el.dataset.loaded='true'});setTimeout(()=>{if(!ready)el.setAttribute('aria-label','Mapa: conexión lenta. Puedes usar Cómo llegar a Better Mood.');},10000);
new ResizeObserver(()=>{map.invalidateSize();}).observe(el);
})();
