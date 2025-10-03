/* ---------- Diccionario nombres edificios ---------- */
const nombresEdificios = {
  "A": "Sector: Procesos",
  "B": "Sector: Termofluidos",
  "C": "Sector: Fundición",
  "General": "Plano General"
};

/* ---------- Mapeo IDs reales en el SVG general ---------- */
/* Ajusta estos valores si tus ids en el SVG son distintos */
const idEdificiosSVG = {
  "A": "Sector_Procesos",
  "B": "Sector_Termofluidos",
  "C": "Sector_Fundicion",
  // otros ids que uses en tu SVG (ejemplo: Biblioteca, OAME...)
  "Biblioteca": "Biblioteca",
  "OAME": "OAME",
  "ALUMNI": "ALUMNI",
  "Tunel": "Tunel"
};

/* ---------- Modal ---------- */
const modal = document.getElementById("infoModal");
document.getElementById("closeModal").addEventListener("click", ()=> modal.classList.remove("active"));

function showInfo(data){
  document.getElementById("modalContent").innerHTML = `
    <h3>${data.nombre}</h3>
    ${data.media && data.media.video ? `<video controls style="width:100%" autoplay="true" loop=true muted="true"><source src="${data.media.video}" type="video/mp4"></video>` : ""}
    <p><strong>Ubicación:</strong> ${data.ubicacion}</p>
    <p>${data.descripcion || ""}</p>
    ${data.media && data.media.foto ? `<img src="${data.media.foto}" alt="${data.nombre}" style="width:100%;cursor:pointer;" onclick="openLightbox('${data.media.foto}')">` : ""}
  `;
  modal.classList.add("active");
}

/* ---------- Lightbox ---------- */
function openLightbox(src){
  const lightbox = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImg");
  img.src = src;
  lightbox.style.display = "flex";
}
document.getElementById("lightboxClose").addEventListener("click", ()=>{
  document.getElementById("lightbox").style.display = "none";
});
document.getElementById("lightbox").addEventListener("click",(e)=>{
  if(e.target.id === "lightbox"){
    document.getElementById("lightbox").style.display = "none";
  }
});

/* ---------- ZoomLayer seguro ---------- */
function crearZoomLayerSiHaceFalta(svgDoc){
  const svg = svgDoc.querySelector("svg");
  if(!svg) return null;
  let gWrapper = svg.querySelector("#zoomLayer");
  if(!gWrapper){
    gWrapper = svgDoc.createElementNS("http://www.w3.org/2000/svg","g");
    gWrapper.setAttribute("id","zoomLayer");
    svg.appendChild(gWrapper);
  }
  return gWrapper;
}

/* ---------- Marcadores ---------- */
let allMarkers = [];
function placeMarkers(svgRoot, ubicaciones){
  allMarkers = [];
  ubicaciones.forEach(ubicacion=>{
    const target = svgRoot.ownerDocument.getElementById(ubicacion.id);
    if(!target) return;
    if(!target.__attached){
      target.setAttribute("fill","transparent");
      target.setAttribute("stroke","white");
      // asegurar que se reciban eventos aun si fill transparente
      try { target.setAttribute("pointer-events","all"); } catch(e){}
      target.style.cursor="pointer";
      target.dataset.nombre=(ubicacion.nombre||"").toLowerCase();
      target.addEventListener("mouseenter", ()=> target.setAttribute("fill","black"));
      target.addEventListener("mouseleave", ()=> target.setAttribute("fill","transparent"));
      target.addEventListener("click", ()=> showInfo(ubicacion));
      target.__attached = true;
    }
    allMarkers.push(target);
  });
}

/* ---------- Filtros mínimos (solo búsqueda) ---------- */
/* Opción 1: no pintar nada mientras se escribe */
function aplicarFiltrosYBusqueda(){
  // deliberadamente vacío (el resaltado ocurre solo en hover sobre sugerencias)
}
document.getElementById("searchInput").removeEventListener && document.getElementById("searchInput").removeEventListener("input", aplicarFiltrosYBusqueda);
document.getElementById("searchInput").addEventListener("input", aplicarFiltrosYBusqueda);

/* ---------- Inicializar colores del plano general ---------- */
function inicializarColoresPlanoGeneral(){
  const obj = document.getElementById("svgGeneral");
  if(!obj) return;
  const svgDoc = obj.contentDocument;
  if(!svgDoc) return;

  // recorrer el diccionario y forzar fill transparent + pointer-events para hover
  Object.values(idEdificiosSVG).forEach(id => {
    if(!id) return;
    const el = svgDoc.getElementById(id);
    if(el){
      // guardar original (por si hicimos highlight y luego reset)
      if(typeof el.dataset.originalFill === "undefined"){
        el.dataset.originalFill = el.getAttribute("fill") || "";
        el.dataset.originalOpacity = el.getAttribute("opacity") || "";
      }
      try {
        el.setAttribute("fill","transparent");
        el.setAttribute("opacity","1");
        el.setAttribute("pointer-events","all"); // importante para hover aunque sea transparente
      } catch(e){}
    }
  });
}

/* ---------- Cargar plano general centralizado ---------- */
function cargarPlanoGeneral(svgFile, jsonFile){
  const obj = document.getElementById("svgGeneral");
  obj.setAttribute("data", svgFile);
  obj.onload = function(){
    const svgDoc = obj.contentDocument;
    if(!svgDoc) return;
    const gWrapper = crearZoomLayerSiHaceFalta(svgDoc);
    // cargar ubicaciones y luego inicializar colores
    if(jsonFile){
      fetch(jsonFile).then(r=>r.json()).then(data=>{
        placeMarkers(gWrapper, data);
        // después de colocar marcadores, forzamos fills transparent para los edificios
        inicializarColoresPlanoGeneral();
      }).catch(err=>{
        // aunque falle el JSON, inicializamos colores
        inicializarColoresPlanoGeneral();
      });
    } else {
      inicializarColoresPlanoGeneral();
    }
  };
}

/* ---------- Autocomplete global ---------- */
function debounce(fn,wait){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),wait);};}
const INDEX_FILE = "data/ubicaciones_index.json";
let mapsIndex = [], nameIndex = [], currentMap = null;

async function buildIndex(){
  try {
    const res = await fetch(INDEX_FILE);
    mapsIndex = await res.json().then(j=>j.maps||j);
  } catch(e){
    mapsIndex = [];
    console.warn("No se pudo cargar index:", e);
  }

  await Promise.all(mapsIndex.map(async entry=>{
    try{
      const r = await fetch(entry.json);
      if(!r.ok) return;
      const items = await r.json();
      items.forEach(it=>{
        nameIndex.push({nombreLower:(it.nombre||"").toLowerCase(), item: it, mapEntry: entry});
      });
    }catch(e){}
  }));
}

const suggestionsEl = document.getElementById("suggestions"), searchInput = document.getElementById("searchInput");

function showSuggestions(list){
  suggestionsEl.innerHTML = "";
  if(!list || list.length === 0){ suggestionsEl.style.display = "none"; return; }

  list.forEach(s=>{
    const li = document.createElement("li");
    const edificioNombre = nombresEdificios[s.mapEntry.edificio] || s.mapEntry.edificio;
    li.textContent = `${s.item.nombre} - ${edificioNombre} - Piso ${s.mapEntry.piso}`;

    // Guardamos info en dataset (útil para debugging)
    li.dataset.edificio = s.mapEntry.edificio;

    // Eventos para hover: resaltan edificio en el plano general
    li.addEventListener("mouseenter", ()=> highlightBuilding(s.mapEntry));
    li.addEventListener("mouseleave", ()=> clearHighlight());

    li.addEventListener("click", ()=> selectSuggestion(s));
    suggestionsEl.appendChild(li);
  });

  suggestionsEl.style.display = "block";
}

function clearSuggestions(){
  suggestionsEl.style.display = "none";
  suggestionsEl.innerHTML = "";
}

searchInput.addEventListener("input", debounce(()=>{
  const q = searchInput.value.trim().toLowerCase(); if(!q){ clearSuggestions(); return; }
  const starts = nameIndex.filter(n=>n.nombreLower.startsWith(q)).slice(0,10);
  const contains = nameIndex.filter(n=>n.nombreLower.includes(q) && !n.nombreLower.startsWith(q)).slice(0,10-starts.length);
  showSuggestions(starts.concat(contains));
}, 150));

searchInput.addEventListener("keydown", e=>{
  if(e.key === "Enter"){
    const q = searchInput.value.trim().toLowerCase(); if(!q) return;
    const pick = nameIndex.find(n=>n.nombreLower===q) || nameIndex.find(n=>n.nombreLower.startsWith(q));
    if(pick) selectSuggestion(pick);
    clearSuggestions();
    searchInput.blur();
  } else if(e.key === "Escape") clearSuggestions();
});

/* ---------- Selección de sugerencia (overlay) ---------- */
async function selectSuggestion(entry){
  const mapEntry = entry.mapEntry;

  const objOverlay = document.getElementById("svgOverlay");
  await new Promise(resolve=>{
    objOverlay.setAttribute("data", mapEntry.svg);
    objOverlay.onload = () => resolve();
  });
  currentMap = mapEntry;

  try {
    const r = await fetch(mapEntry.json);
    const data = await r.json();
    const svgDoc = objOverlay.contentDocument;
    const svg = svgDoc.querySelector("svg");
    if(svg && !svg.querySelector("#overlayBackground")){
      const rect = svgDoc.createElementNS("http://www.w3.org/2000/svg","rect");
      rect.setAttribute("id","overlayBackground");
      rect.setAttribute("x","0");
      rect.setAttribute("y","0");
      rect.setAttribute("width","100%");
      rect.setAttribute("height","100%");
      rect.setAttribute("fill","white");
      rect.setAttribute("opacity","0.1");
      svg.insertBefore(rect, svg.firstChild);
    }
    const gWrapper = crearZoomLayerSiHaceFalta(svgDoc);
    placeMarkers(gWrapper, data);
  } catch(e){ console.warn(e); }

  focusOnLocation(entry.item);
  clearSuggestions();
  searchInput.blur();

  // hacer transparente el plano general (el valor 0.1 => 90% transparente)
  document.getElementById("svgGeneral").style.opacity = "0.1";
}

/* ---------- Focus ---------- */
function focusOnLocation(ubicacion){
  const obj = document.getElementById("svgOverlay"), svgDoc = obj.contentDocument;
  if(!svgDoc) return;
  const el = svgDoc.getElementById(ubicacion.id);
  if(!el) return;
  el.setAttribute("fill","black"); el.setAttribute("opacity","0.9");
  showInfo(ubicacion);
}

/* ---------- Highlight edificio en plano general ---------- */
function highlightBuilding(mapEntry){
  const obj = document.getElementById("svgGeneral");
  if(!obj) return;
  const svgDoc = obj.contentDocument;
  if(!svgDoc) return;

  clearHighlight();

  const svgId = idEdificiosSVG[mapEntry.edificio] || mapEntry.edificio;
  if(!svgId) return;
  const buildingEl = svgDoc.getElementById(svgId);
  if(!buildingEl) return;

  // guardar estado original
  buildingEl.dataset.originalFill = buildingEl.getAttribute("fill") || "";
  buildingEl.dataset.originalOpacity = buildingEl.getAttribute("opacity") || "";

  // aplicar resaltado
  buildingEl.setAttribute("fill","#f39c12"); // naranja
  buildingEl.setAttribute("opacity","0.45");
}

/* ---------- Quitar highlight ---------- */
function clearHighlight(){
  const obj = document.getElementById("svgGeneral");
  if(!obj) return;
  const svgDoc = obj.contentDocument;
  if(!svgDoc) return;

  Object.values(idEdificiosSVG).forEach(id=>{
    const el = svgDoc.getElementById(id);
    if(el && typeof el.dataset.originalFill !== "undefined"){
      el.setAttribute("fill", el.dataset.originalFill || "transparent");
      el.setAttribute("opacity", el.dataset.originalOpacity || "1");
      delete el.dataset.originalFill;
      delete el.dataset.originalOpacity;
    }
  });
}

/* ---------- Reset ---------- */
document.getElementById("resetViewBtn").addEventListener("click", async ()=>{
  const general = mapsIndex.find(m=>(m.edificio && m.edificio.toLowerCase()==="general") || m.piso===0);
  const defaultMap = general || mapsIndex[0];
  if(!defaultMap) return;

  // usar la función centralizada para cargar el plano general
  cargarPlanoGeneral(defaultMap.svg, defaultMap.json);
  currentMap = defaultMap;

  // limpiar overlay
  document.getElementById("svgOverlay").removeAttribute("data");

  // volver opaco el plano general
  document.getElementById("svgGeneral").style.opacity = "1";

  modal.classList.remove("active");
  document.getElementById("searchInput").value="";
  clearSuggestions();
});

/* ---------- Inicio ---------- */
window.addEventListener("load", async ()=>{
  await buildIndex();
  const general = mapsIndex.find(m=>(m.edificio && m.edificio.toLowerCase()==="general") || m.piso===0);
  const defaultMap = general || mapsIndex[0];
  if(defaultMap){
    // usar la función centralizada para cargar el plano general
    cargarPlanoGeneral(defaultMap.svg, defaultMap.json);
    currentMap = defaultMap;
  }
});
