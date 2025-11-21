/* ----------------- script.js (actualizado) ----------------- */

const alias = {
    "secretaria": "oficina secretaria dimec",
    "dimec": "departamento de ingeniería mecánica"
};


/* ---------- Diccionario nombres edificios (texto paa sugerencias) ---------- */
const nombresEdificios = {
  "A": "Sector: Procesos",
  "B": "Sector: Termofluidos",
  "C": "Sector: Fundición",
  "D": "Sector: Hall DIMEC",
  "General": "Plano General",
  "Biblioteca": "Biblioteca Central Irma Salas Silva",
  "OAME": "Oficina de Acompañamiento y Monitoreo Estudiantil",
  "ALUMNI": "ALUMNI",
  "Tunel": "Tunel"
};

/* ---------- Mapeo ids reales en el SVG general (ajusta si es necesario) ---------- */
const idEdificiosSVG = {
  "A": "Sector_Procesos",
  "B": "Sector_Termofluidos",
  "C": "Sector_Fundicion",
  "D": "Sector_Hall_DIMEC",
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
      target.addEventListener("mouseenter", ()=> target.setAttribute("fill","#003082")); //al pasar el muose sobre las ubicaciones del mapa
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
      items.forEach(it => {
        const keywords = [
            it.nombre || "",
            it.id || "",
            it.ubicacion || ""
        ].join(" ").toLowerCase();

      nameIndex.push({
          nombreLower: keywords,   // antes solo era el nombre
          item: it,
          mapEntry: entry
      });
      });
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
    const edificioNombre = nombresEdificios[s.item.sector] || s.item.sector;
    li.textContent = `${s.item.nombre} - ${edificioNombre} - Piso ${s.mapEntry.piso}`;

    // guardamos la referencia por si quieres debug
    li.dataset.edificio = s.mapEntry.edificio || "";

    // hover => highlight edificio en plano general
    li.addEventListener("mouseenter", ()=> {
      try { highlightBuilding({ edificio: s.item.sector }); } catch(e){ console.warn("highlightBuilding err", e); }
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
  const query = alias[q] || q;
  if(!q){ clearSuggestions(); return; }
  const starts = nameIndex.filter(n=>n.nombreLower.startsWith(q)).slice(0,10);
  const contains = nameIndex.filter(n=>n.nombreLower.includes(q) && !n.nombreLower.startsWith(q)).slice(0,10-starts.length);
  showSuggestions(starts.concat(contains));
}, 150));

searchInput.addEventListener("keydown", e=>{
  if(e.key === "Enter"){
    let q = searchInput.value.trim().toLowerCase();
    if (alias[q]) q = alias[q];
    if(!q) return;
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

/* ---------- Highlight robusto (reemplazar) ---------- */
function highlightBuilding(mapEntry){
  try {
    const obj = document.getElementById("svgGeneral");
    if(!obj) { console.warn("svgGeneral not found"); return; }
    const svgDoc = obj.contentDocument;
    if(!svgDoc) { console.warn("svgGeneral.contentDocument not ready"); return; }

    clearHighlight(); // restore previous

    // resolver id candidato
    let key = (idEdificiosSVG[mapEntry.edificio] || mapEntry.edificio || "").toString().trim();
    if(!key) { console.warn("No key for mapEntry", mapEntry); return; }

    // intentar getElementById directo (varias variantes)
    let el = svgDoc.getElementById(key) || svgDoc.getElementById(key.toLowerCase()) || svgDoc.getElementById(key.toUpperCase());
    // fallback: buscar por substring (case-insensitive)
    if(!el){
      const needle = key.toLowerCase();
      const all = svgDoc.querySelectorAll('[id]');
      for(let i=0;i<all.length;i++){
        const id = (all[i].id||"").toString().toLowerCase();
        if(id && id.includes(needle)){
          el = all[i];
          break;
        }
      }
    }

    if(!el){
      console.warn("No SVG element found for key:", key);
      return;
    }

    // Función que aplica el highlight a un elemento (y guarda originales)
    function applyHighlight(node){
      if(!node || node.nodeType !== 1) return; // ELEMENT_NODE
      try {
        // Guarda originales como atributos data-... (seguro y fácil de restaurar)
        if(node.hasAttribute("fill") || node.tagName.toLowerCase()==="path" || node.tagName.toLowerCase()==="rect" || node.tagName.toLowerCase()==="polygon"){
          node.setAttribute("data-original-fill", node.getAttribute("fill") || "");
          node.setAttribute("data-original-opacity", node.getAttribute("opacity") || (node.style && node.style.opacity) || "");
          node.setAttribute("fill", "#000000ff"); //Para resaltar las flechas negras
          node.setAttribute("opacity", "1");
        } else {
          // aún si no tiene fill explícito, forzamos visibilidad en caso de máscaras/opacity
          node.setAttribute("data-original-opacity", node.getAttribute("opacity") || (node.style && node.style.opacity) || "");
          node.setAttribute("opacity", "0.5");
        }
        // Asegurar visibilidad y eventos
        node.setAttribute("display", node.getAttribute("display") || "inline");
        node.style && (node.style.pointerEvents = "all");
      } catch(e){ /* no bloquear */ }
    }

    // Aplicar highlight al elemento principal y a todos sus hijos
    applyHighlight(el);
    const children = el.querySelectorAll("*");
    for(let i=0;i<children.length;i++){
      applyHighlight(children[i]);
    }

    // También intentar hacer visible cualquier ancestro que esté oculto por display/opacity
    let parent = el.parentNode;
    while(parent && parent !== svgDoc){
      try {
        if(parent.setAttribute) {
          parent.setAttribute("display", parent.getAttribute("display") || "inline");
          parent.setAttribute("opacity", parent.getAttribute("opacity") || "1");
        }
      } catch(e){}
      parent = parent.parentNode;
    }

  } catch(err) {
    console.error("highlightBuilding error:", err);
  }
}

/* ---------- clearHighlight robusto (reemplazar) ---------- */
function clearHighlight(){
  try {
    const obj = document.getElementById("svgGeneral");
    if(!obj) return;
    const svgDoc = obj.contentDocument;
    if(!svgDoc) return;

    // Restaurar todos los elementos que tengan data-original-fill u original-opacity
    const touched = svgDoc.querySelectorAll('[data-original-fill], [data-original-opacity]');
    if(touched && touched.length){
      touched.forEach(el=>{
        try {
          if(el.hasAttribute("data-original-fill")){
            const of = el.getAttribute("data-original-fill");
            if(of === "") el.removeAttribute("fill");
            else el.setAttribute("fill", of);
            el.removeAttribute("data-original-fill");
          }
          if(el.hasAttribute("data-original-opacity")){
            const oo = el.getAttribute("data-original-opacity");
            if(oo === "") el.removeAttribute("opacity");
            else el.setAttribute("opacity", oo);
            el.removeAttribute("data-original-opacity");
          }
          // limpiamos display si lo forzamos
          if(el.hasAttribute("display")) {
            // solo borrar si fue agregado por highlight (no perfecto, pero seguro para la mayoría)
            // si el elemento originalmente no tenía data-original-display, no lo tocamos
            // (si quisieras, podríamos guardar data-original-display también)
          }
          if(el.style) el.style.pointerEvents = "";
        } catch(e){}
      });
    }

    // También restaurar IDs conocidos del mapping (por seguridad)
    const ids = Object.values(idEdificiosSVG || {});
    ids.forEach(id=>{
      try {
        const el = svgDoc.getElementById(id);
        if(el && el.hasAttribute("data-original-fill")){
          const of = el.getAttribute("data-original-fill");
          if(of === "") el.removeAttribute("fill"); else el.setAttribute("fill", of);
          el.removeAttribute("data-original-fill");
        }
        if(el && el.hasAttribute("data-original-opacity")){
          const oo = el.getAttribute("data-original-opacity");
          if(oo === "") el.removeAttribute("opacity"); else el.setAttribute("opacity", oo);
          el.removeAttribute("data-original-opacity");
        }
      } catch(e){}
    });

  } catch(err) {
    console.error("clearHighlight error:", err);
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
  const objOverlay = document.getElementById("svgOverlay");

  await new Promise(resolve=>{
    objOverlay.setAttribute("data", mapEntry.svg);
    objOverlay.onload = ()=> resolve();
  });

  currentMap = mapEntry;

  try {
    const r = await fetch(mapEntry.json);
    const data = await r.json();
    const svgDoc = objOverlay.contentDocument;
    const svg = svgDoc.querySelector("svg");
    // Asegurar que el SVG no tenga opacidad global
    if (svg) {
      svg.style.opacity = "1";
      svg.style.visibility = "visible";
    }

    // Fondo blanco semitransparente detrás del edificio
    let bg = svgDoc.getElementById("overlayBackground");
    if (!bg) {
      bg = svgDoc.createElementNS("http://www.w3.org/2000/svg", "rect");
      bg.setAttribute("id", "overlayBackground");
      bg.setAttribute("x", "0");
      bg.setAttribute("y", "0");
      bg.setAttribute("width", "100%");
      bg.setAttribute("height", "100%");
      bg.setAttribute("fill", "white");
      bg.setAttribute("opacity", "0.1");
      svg.insertBefore(bg, svg.firstChild);
    }


    const gWrapper = crearZoomLayerSiHaceFalta(svgDoc);
    placeMarkers(gWrapper, data);

    // Activamos eventos del overlay
    objOverlay.style.pointerEvents = "auto";

    objOverlay.style.opacity = "1";
    objOverlay.style.visibility = "visible";

  } catch(e) {
    console.error("Error cargando overlay:", e);
  }

  // Resaltamos el sector en el plano general
  highlightBuilding({ edificio: entry.item.sector });

  // Resaltamos ubicación seleccionada
  focusOnLocation(entry.item);

  // Limpiamos sugerencias y ocultamos
  clearSuggestions();
  searchInput.blur();

  // Hacemos semitransparente el plano general
  const general = document.getElementById("svgGeneral");
  general.style.opacity = "0.1";
  general.style.pointerEvents = "none"; // evita doble clic pero no bloquea overlay
}


/* ---------- Focus en la ubicación (overlay) ---------- */
function focusOnLocation(ubicacion){
  const obj = document.getElementById("svgOverlay");
  const svgDoc = obj.contentDocument;
  if(!svgDoc) return;
  const el = svgDoc.getElementById(ubicacion.id);
  if(!el) return;
  try {
    el.setAttribute("fill","#CF142B"); //para resaltar la ubicación seleccionada al buscar
    el.setAttribute("opacity","1");
  } catch(e){}
  showInfo(ubicacion);
}

/* ---------- Reset optimizado ---------- */
document.getElementById("resetViewBtn").addEventListener("click", async () => {
  const objGeneral = document.getElementById("svgGeneral");
  const objOverlay = document.getElementById("svgOverlay");

  // Buscar el mapa general en el índice
  const general = mapsIndex.find(
    m => (m.edificio && m.edificio.toLowerCase() === "general") || m.piso === 0
  );
  const defaultMap = general || mapsIndex[0];
  if (!defaultMap) return;

  // Restaurar datos del mapa general
  await new Promise(resolve => {
    objGeneral.setAttribute("data", defaultMap.svg);
    objGeneral.onload = () => resolve();
  });
  currentMap = defaultMap;

  try {
    const r = await fetch(defaultMap.json);
    const data = await r.json();
    const svgDoc = objGeneral.contentDocument;
    const gWrapper = crearZoomLayerSiHaceFalta(svgDoc);
    placeMarkers(gWrapper, data);
  } catch (e) {
    console.error("Error recargando el mapa general:", e);
  }

  // 🔧 Restaurar visibilidad e interactividad del mapa general
  objGeneral.style.opacity = "1";
  setTimeout(() => {
  objGeneral.style.pointerEvents = "auto";
  }, 300);

  objGeneral.style.visibility = "visible";
  objGeneral.style.pointerEvents = "auto";

  // 🔧 Ocultar y desactivar el overlay
  objOverlay.removeAttribute("data");
  objOverlay.style.opacity = "0";
  objOverlay.style.visibility = "hidden";
  objOverlay.style.pointerEvents = "none";

  // 🔧 Limpiar modal y cuadro de búsqueda
  modal.classList.remove("active");
  document.getElementById("searchInput").value = "";
  clearSuggestions();
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
