/* Perimeter from the supplied marked map; street intersections from OpenStreetMap. */
(()=>{const el=document.getElementById('search-map');if(!el)return;
if(!window.L){el.textContent='No pudimos cargar el mapa. Usa el enlace para llegar a Better Mood.';return;}
const map=L.map(el,{scrollWheelZoom:false,zoomSnap:.25,zoomControl:true,attributionControl:true});
const streets=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
const tiles=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, GIS User Community'});
const labels=L.tileLayer('https://basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',{maxZoom:19,attribution:'Labels &copy; <a href="https://carto.com/attributions">CARTO</a>, &copy; OpenStreetMap'});
const toggle=document.getElementById('map-style');toggle.onclick=()=>{const satellite=map.hasLayer(tiles);if(satellite){map.removeLayer(labels);map.removeLayer(tiles);streets.addTo(map);}else{map.removeLayer(streets);tiles.addTo(map);labels.addTo(map);}toggle.textContent=satellite?'Ver satélite':'Ver calles';toggle.setAttribute('aria-pressed',String(!satellite));};
const boundary=[[19.0521496,-98.219509],[19.0491516,-98.2132829],[19.0451488,-98.2153951],[19.047544,-98.2200274],[19.0489617,-98.2192284],[19.0497839,-98.220857]];
const zone=L.polygon(boundary,{color:'#ffde00',weight:3,fillColor:'#ffde00',fillOpacity:.10,className:'search-perimeter'}).addTo(map);
const reset=()=>map.fitBounds(zone.getBounds(),{padding:[22,22],animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});reset();
L.circleMarker([19.04859,-98.21655],{radius:7,color:'#231f20',fillColor:'#ffde00',fillOpacity:1}).addTo(map).bindTooltip('UPAEP · Campus central',{direction:'top',permanent:true,className:'map-reference'});
// Venue coordinate corroborated in Restaurant Guru geo metadata, 20 October 2026.
L.marker([19.0483687,-98.2179083],{icon:L.divIcon({className:'mood-map-pin',html:'<img src="/assets/logo-better-mood.png" alt="Better Mood">',iconSize:[48,48],iconAnchor:[24,24]})}).addTo(map).bindTooltip('Better Mood',{direction:'bottom',permanent:true,className:'map-reference'}).bindPopup('<strong>Better Mood</strong><br>Cartón gratis · 13 Poniente 2302<br><a href="https://maps.app.goo.gl/Cx8Rz7zSEPTYzUxr6?g_st=ic" target="_blank" rel="noopener">Cómo llegar ↗</a>');
document.getElementById('map-reset').onclick=reset;
let ready=false;for(const layer of [streets,tiles])layer.on('load',()=>{ready=true;el.dataset.loaded='true'});setTimeout(()=>{if(!ready)el.setAttribute('aria-label','Mapa: conexión lenta. Puedes usar Cómo llegar a Better Mood.');},10000);
new ResizeObserver(()=>{map.invalidateSize();}).observe(el);
})();
