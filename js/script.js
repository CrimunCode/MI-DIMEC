/* ----------------- script.js (actualizado) ----------------- */

/* ---------- Diccionario nombres edificios (texto para sugerencias) ---------- */
const nombresEdificios = {
  "A": "Sector: Procesos",
  "B": "Sector: Termofluidos",
  "C": "Sector: Fundición",
  "General": "Plano General"
};

/* ---------- Mapeo ids reales en el SVG general (ajusta si es necesario) ---------- */
const idEdificiosSVG = {
  "A": "Sector_Procesos",
  "B": "Sector_Termofluidos",
  "C": "Sector_Fundicion",
  // agrega aquí otros ids que uses en el SVG general si aplican
  "Biblioteca": "Biblioteca",
  "OAME": "OAME",
  "ALUMNI": "ALUMNI",
  "Tunel": "Tunel"
};

/* ---------- Utilidades para asegurar carga de <object> ---------- */
function ensureObjectLoaded(obj) {
  return new Promise(resolve => {
    if (!obj) return resolve();
    try {
      if (obj.contentDocument && obj.contentDocument.readyState) return resolve();
    } catch (e) {}
    // si no está listo, espera al evento load
    const onLoad = ()=> { obj.removeEventListener('load', onLoad); resolve(); };
    obj.addEventListener('load', onLoad, { once: true });
  });
}

function loadObjectData(obj, url) {
  return new Promise(resolve => {
    if (!obj) return resolve();
    const onLoad = ()=> { obj.removeEventListener('load', onLoad); resolve(); };
    obj.addEventListener('load', onLoad, { once: true });
    // setAttribute AFTER listener to avoid race
    obj.setAttribute('data', url);
  });
}

/* ---------- Modal ---------- */
const modal = document.getElementById("infoModal");
document.getElementById("closeModal").addEventListener("click", ()=> modal.classList.remove("active"));

function showInfo(data) {
  const modalContent = document.getElementById("modalContent");
  modalContent.innerHTML = `
    <h3>${data.nombre}</h3>
    ${data.media && data.media.video ? `<video controls style="width:100%;border-radius:10px;" autoplay loop muted><source src="${data.media.video}" type="video/mp4"></video>` : ""}
    <p><strong>Ubicación:</strong> ${data.ubicacion || ""}</p>
    <p>${data.descripcion || ""}</p>
  `;

  // Si tiene varias fotos
  if (data.media && data.media.fotos && data.media.fotos.length > 0) {
    const img = document.createElement("img");
    img.src = data.media.fotos[0];
    img.alt = data.nombre;
    img.style.width = "100%";
    img.style.cursor = "pointer";
    img.style.borderRadius = "10px";

    // 👇 Añadimos evento dinámico
    img.addEventListener("click", () => {
      openLightboxGallery(data.media.fotos);
    });

    modalContent.appendChild(img);
  } 
  // Si tiene solo una foto (formato antiguo)
  else if (data.media && data.media.foto) {
    const img = document.createElement("img");
    img.src = data.media.foto;
    img.alt = data.nombre;
    img.style.width = "100%";
    img.style.cursor = "pointer";
    img.style.borderRadius = "10px";

    img.addEventListener("click", () => openLightbox(data.media.foto));
    modalContent.appendChild(img);
  }

  modal.classList.add("active");
}


/* ---------- LIGHTBOX MEJORADO (para galería completa) ---------- */
let lightboxImages = [];
let currentLightboxIndex = 0;

// Abre solo una imagen (modo antiguo)
function openLightbox(src){
  lightboxImages = [src];
  currentLightboxIndex = 0;
  document.getElementById("lightboxImg").src = src;
  document.getElementById("lightbox").style.display = "flex";
}

// Abre toda la galería de imágenes
function openLightboxGallery(fotos) {
  if (!Array.isArray(fotos) || fotos.length === 0) return;
  lightboxImages = fotos;
  currentLightboxIndex = 0;

  const img = document.getElementById("lightboxImg");
  img.src = fotos[0];

  const lightbox = document.getElementById("lightbox");
  lightbox.style.display = "flex";
}


function navigateLightbox(direction){
  if(lightboxImages.length <= 1) return;
  currentLightboxIndex = (currentLightboxIndex + direction + lightboxImages.length) % lightboxImages.length;
  document.getElementById("lightboxImg").src = lightboxImages[currentLightboxIndex];
}

document.getElementById("lightboxClose").addEventListener("click", ()=>{
  document.getElementById("lightbox").style.display = "none";
  lightboxImages = [];
});

document.getElementById("lightbox").addEventListener("click",(e)=>{
  if(e.target.id === "lightbox"){
    document.getElementById("lightbox").style.display = "none";
    lightboxImages = [];
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

/* ---------- Marcadores (ubicaciones) ---------- */
let allMarkers = [];
function placeMarkers(svgRoot, ubicaciones){
  allMarkers = [];
  ubicaciones.forEach(ubicacion=>{
    const target = svgRoot.ownerDocument.getElementById(ubicacion.id);
    if(!target) return;
    if(!target.__attached){
      try { target.setAttribute("fill","transparent"); } catch(e){}
      try { target.setAttribute("stroke","white"); } catch(e){}
      try { target.setAttribute("pointer-events","all"); } catch(e){} // importante para hover cuando fill transparent
      target.style.cursor="pointer";
      target.dataset.nombre = (ubicacion.nombre||"").toLowerCase();
      target.addEventListener("mouseenter", ()=> target.setAttribute("fill","black"));
      target.addEventListener("mouseleave", ()=> target.setAttribute("fill","transparent"));
      target.addEventListener("click", ()=> showInfo(ubicacion));
      target.__attached = true;
    }
    allMarkers.push(target);
  });
}

/* ---------- No pintar mientras se escribe (opción 1) ---------- */
function aplicarFiltrosYBusqueda(){
  // deliberadamente vacío: el resaltado ocurre solo en hover sobre sugerencias
}
// si existía listener previo, ya se maneja desde index.html al incluir script
document.getElementById("searchInput").removeEventListener && document.getElementById("searchInput").removeEventListener("input", aplicarFiltrosYBusqueda);
document.getElementById("searchInput").addEventListener("input", aplicarFiltrosYBusqueda);

/* ---------- Inicializar colores del plano general ---------- */
function inicializarColoresPlanoGeneral(){
  const obj = document.getElementById("svgGeneral");
  if(!obj) return;
  const svgDoc = obj.contentDocument;
  if(!svgDoc) return;

  Object.values(idEdificiosSVG).forEach(id => {
    if(!id) return;
    const el = svgDoc.getElementById(id);
    if(el){
      // guarda original si no existe
      if(typeof el.dataset.originalFill === "undefined"){
        el.dataset.originalFill = el.getAttribute("fill") || "";
        el.dataset.originalOpacity = el.getAttribute("opacity") || "";
      }
      try {
        el.setAttribute("fill","transparent");
        el.setAttribute("opacity","1");
        el.setAttribute("pointer-events","all");
      } catch(e){}
    }
  });
}

/* ---------- Autocomplete / index ---------- */
function debounce(fn,wait){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),wait);};}
const INDEX_FILE = "data/ubicaciones_index.json";
let mapsIndex = [], nameIndex = [], currentMap = null;
let cachedGeneralLocations = null;

async function buildIndex(){
  try {
    const res = await fetch(INDEX_FILE);
    mapsIndex = await res.json().then(j=>j.maps||j);
  } catch(e){
    mapsIndex = [];
    console.warn("No se pudo cargar index:", e);
  }
  await Promise.all(mapsIndex.map(async entry=>{
    try {
      const r = await fetch(entry.json);
      if(!r.ok) return;
      const items = await r.json();
      items.forEach(it => nameIndex.push({
        nombreLower: (it.nombre||"").toLowerCase(),
        item: it,
        mapEntry: entry
      }));
    } catch(e){}
  }));
}

/* ---------- Sugerencias ---------- */
const suggestionsEl = document.getElementById("suggestions"),
      searchInput = document.getElementById("searchInput");

function showSuggestions(list){
  suggestionsEl.innerHTML = "";
  if(!list || list.length === 0){ suggestionsEl.style.display = "none"; return; }

  list.forEach(s=>{
    const li = document.createElement("li");
    const edificioNombre = nombresEdificios[s.mapEntry.edificio] || s.mapEntry.edificio;
    li.textContent = `${s.item.nombre} - ${edificioNombre} - Piso ${s.mapEntry.piso}`;

    // guardamos la referencia por si quieres debug
    li.dataset.edificio = s.mapEntry.edificio || "";

    // hover => highlight edificio en plano general
    li.addEventListener("mouseenter", ()=> {
      try { highlightBuilding(s.mapEntry); } catch(e){ console.warn("highlightBuilding err", e); }
    });
    li.addEventListener("mouseleave", ()=> { try { clearHighlight(); } catch(e){} });

    // click => seleccionar
    li.addEventListener("click", ()=> selectSuggestion(s));

    suggestionsEl.appendChild(li);
  });

  suggestionsEl.style.display = "block";
}

function clearSuggestions(){
  suggestionsEl.style.display = "none";
  suggestionsEl.innerHTML = "";
}

/* ---------- Eventos de búsqueda ---------- */
searchInput.addEventListener("input", debounce(()=>{
  const q = searchInput.value.trim().toLowerCase();
  if(!q){ clearSuggestions(); return; }
  const starts = nameIndex.filter(n=>n.nombreLower.startsWith(q)).slice(0,10);
  const contains = nameIndex.filter(n=>n.nombreLower.includes(q) && !n.nombreLower.startsWith(q)).slice(0,10-starts.length);
  showSuggestions(starts.concat(contains));
}, 150));

searchInput.addEventListener("keydown", e=>{
  if(e.key === "Enter"){
    const q = searchInput.value.trim().toLowerCase(); if(!q) return;
    const pick = nameIndex.find(n=>n.nombreLower===q) || nameIndex.find(n=>n.nombreLower.startsWith(q));
    if(pick) selectSuggestion(pick);
    clearSuggestions(); searchInput.blur();
  } else if(e.key === "Escape") clearSuggestions();
});

/* ---------- Resolve id robusto ---------- */
function resolveSvgId(mapEntry){
  if(!mapEntry) return null;
  const key = String(mapEntry.edificio || "").trim();
  if(!key) return null;
  // Prefer mapping
  if(idEdificiosSVG[key]) return idEdificiosSVG[key];
  // try direct variations
  const cand = [
    key,
    "edificio" + key,
    key.toUpperCase(),
    key.replace(/\s+/g,"_"),
    key.replace(/\s+/g,"")
  ];
  // if none found we will try later to search by substring
  return cand[0]; // return first as baseline; highlightBuilding will try to find actual element
}

/* ---------- Highlight / clear ---------- */
function highlightBuilding(mapEntry){
  const obj = document.getElementById("svgGeneral");
  if(!obj) return;
  const svgDoc = obj.contentDocument;
  if(!svgDoc) return;

  clearHighlight();

  // Try mapped id first, otherwise attempt to find matching element
  let svgId = idEdificiosSVG[mapEntry.edificio] || String(mapEntry.edificio || "");
  let el = svgDoc.getElementById(svgId);

  // fallback: try uppercase or "edificio"+key
  if(!el){
    const alt = svgId.toString().toUpperCase();
    el = svgDoc.getElementById(alt) || svgDoc.getElementById("edificio" + svgId);
  }

  // fallback: try find element whose id contains the key (case-insensitive)
  if(!el){
    const needle = (svgId || "").toString().toLowerCase();
    if(needle){
      const all = svgDoc.querySelectorAll('[id]');
      for(let i=0;i<all.length;i++){
        const id = all[i].id || "";
        if(id.toLowerCase().includes(needle)){
          el = all[i];
          break;
        }
      }
    }
  }

  if(!el) return;

  // store original
  el.dataset.originalFill = el.getAttribute("fill") || "";
  el.dataset.originalOpacity = el.getAttribute("opacity") || "";

  try {
    el.setAttribute("fill", "black"); // gris
    el.setAttribute("opacity", "0.9");
  } catch(e){}
}

function clearHighlight(){
  const obj = document.getElementById("svgGeneral");
  if(!obj) return;
  const svgDoc = obj.contentDocument;
  if(!svgDoc) return;

  // restore for known ids
  Object.values(idEdificiosSVG).forEach(id=>{
    const el = svgDoc.getElementById(id);
    if(el && typeof el.dataset.originalFill !== "undefined"){
      try {
        el.setAttribute("fill", el.dataset.originalFill || "transparent");
        el.setAttribute("opacity", el.dataset.originalOpacity || "1");
        delete el.dataset.originalFill;
        delete el.dataset.originalOpacity;
      } catch(e){}
    }
  });

  // also try to restore any other element we may have touched (safety)
  const touched = svgDoc.querySelectorAll('[data-original-fill]');
  if(touched && touched.length){
    touched.forEach(el=>{
      try {
        el.setAttribute("fill", el.dataset.originalFill || "transparent");
        el.setAttribute("opacity", el.dataset.originalOpacity || "1");
        delete el.dataset.originalFill;
        delete el.dataset.originalOpacity;
      } catch(e){}
    });
  }
}

/* ---------- Funciones para animar transiciones ---------- */
function fadeOut(el){
  if(!el) return;
  el.classList.remove("fade-in");
  el.classList.add("fade-out");
}

function fadeIn(el){
  if(!el) return;
  el.classList.remove("fade-out");
  el.classList.add("fade-in");
}

/* ---------- Selección de sugerencia (AHORA con highlight previo) ---------- */
async function selectSuggestion(entry){
  const mapEntry = entry.mapEntry;

  // 1) asegurar svgGeneral cargado y resaltar edificio en el general
  const objGeneral = document.getElementById("svgGeneral");
  await ensureObjectLoaded(objGeneral); // espera si fuera necesario
  try { highlightBuilding(mapEntry); } catch(e){ console.warn(e); }

  // 2) cargar overlay del piso/edificio (objOverlay)
  const objOverlay = document.getElementById("svgOverlay");
  await loadObjectData(objOverlay, mapEntry.svg);
  currentMap = mapEntry;

  // 3) cargar ubicaciones del overlay y colocar marcadores
  try {
    const r = await fetch(mapEntry.json);
    const data = await r.json();
    const svgDoc = objOverlay.contentDocument;
    const gWrapper = crearZoomLayerSiHaceFalta(svgDoc);
    placeMarkers(gWrapper, data);
  } catch(e){ console.warn("Error cargando json overlay:", e); }

  // 4) centrar / destacar la ubicación, limpiar sugerencias y atenuar general
  focusOnLocation(entry.item);
  clearSuggestions();
  searchInput.blur();

  const generalObj = document.getElementById("svgGeneral");

  // Efecto de salida del mapa general
  fadeOut(generalObj);
  setTimeout(()=> {
    generalObj.style.opacity = "0.1";
  fadeIn(document.getElementById("svgOverlay"));
  }, 100);

}

/* ---------- Focus en la ubicación (overlay) ---------- */
function focusOnLocation(ubicacion){
  const obj = document.getElementById("svgOverlay");
  const svgDoc = obj.contentDocument;
  if(!svgDoc) return;
  const el = svgDoc.getElementById(ubicacion.id);
  if(!el) return;
  try {
    el.setAttribute("fill","black");
    el.setAttribute("opacity","0.9");
  } catch(e){}
  showInfo(ubicacion);
}

/* ---------- Reset optimizado ---------- */
document.getElementById("resetViewBtn").addEventListener("click", ()=>{
  // quitar overlay
  const overlay = document.getElementById("svgOverlay");
  // volver opaco el general
  const general = document.getElementById("svgGeneral");
  fadeOut(overlay);
  setTimeout(()=>{
    overlay.removeAttribute("data");
    general.style.opacity = "1";
    fadeIn(general);
  }, 100);
  // inicializar colores (transparent) y reposicionar marcadores cacheados
  inicializarColoresPlanoGeneral();
  if(cachedGeneralLocations){
    const svgDoc = general.contentDocument;
    const gWrapper = crearZoomLayerSiHaceFalta(svgDoc);
    placeMarkers(gWrapper, cachedGeneralLocations);
  }
  modal.classList.remove("active");
  document.getElementById("searchInput").value = "";
  clearSuggestions();
  clearHighlight();
});

/* ---------- Inicio: cargar index y plano general (una sola vez) ---------- */
window.addEventListener("load", async ()=>{
  await buildIndex();
  const general = mapsIndex.find(m=>(m.edificio && m.edificio.toLowerCase()==="general") || m.piso===0);
  const defaultMap = general || mapsIndex[0];
  if(!defaultMap) return;

  // cargar SVG general y luego JSON de ubicaciones (cache)
  const objGeneral = document.getElementById("svgGeneral");
  objGeneral.setAttribute("data", defaultMap.svg);
  objGeneral.onload = async ()=>{
    try {
      const r = await fetch(defaultMap.json);
      const data = await r.json();
      cachedGeneralLocations = data;
      const svgDoc = objGeneral.contentDocument;
      const gWrapper = crearZoomLayerSiHaceFalta(svgDoc);
      placeMarkers(gWrapper, data);
      inicializarColoresPlanoGeneral();
    } catch(e){
      // aunque falle el JSON, intentamos inicializar colores
      try { inicializarColoresPlanoGeneral(); } catch(err){}
      console.warn("No se pudieron cargar ubicaciones generales:", e);
    }
  };
});

/* ---------- GALERÍA: navegación ---------- */
let currentGalleryIndex = 0;

function moveGallery(direction){
  const slide = document.getElementById("gallerySlide");
  if(!slide) return;

  const total = slide.children.length;
  currentGalleryIndex = (currentGalleryIndex + direction + total) % total;

  slide.style.transform = `translateX(-${currentGalleryIndex * 100}%)`;
}


/* ----------------- fin script.js ----------------- */
