/* ----------------- script.js (completo rearmado, optimizado y con cache) ----------------- */
/*
  - Caching de JSON
  - Inyección de CSS dentro de cada SVG cargado en <object>
  - Highlight robusto (<g> o <path>)
  - Pulsing (clase .flecha-pulsando) inyectada dentro del SVG
  - loadGeneralMap() que se encarga de reinyectar todo en cada recarga
  - buildIndex() con caché y deduplicado
*/

const INDEX_FILE = "data/ubicaciones_index.json";

const idEdificiosSVG = {
  "A": "Sector_Procesos",
  "B": "Sector_Termofluidos",
  "C": "Sector_Fundicion",
  "D": "Sector_Hall_DIMEC",
  "Biblioteca": "Biblioteca",
  "OAME": "OAME",
  "ALUMNI": "ALUMNI",
  "Tunel": "Tunel",
  "General": "Sector_Procesos"
};

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

const alias = {
  "secretaria": "oficina secretaria dimec",
  "dimec": "departamento de ingeniería mecánica"
};

/* ---------- CACHES ---------- */
const jsonCache = new Map();

/* ---------- DOM refs ---------- */
const suggestionsEl = document.getElementById("suggestions");
const searchInput = document.getElementById("searchInput");
const modal = document.getElementById("infoModal");
const modalCloseBtn = document.getElementById("closeModal");

/* ---------- Fetch JSON with cache ---------- */
async function fetchJSONCached(url){
  if(!url) return null;
  if(jsonCache.has(url)) return jsonCache.get(url);
  const p = fetch(url).then(async r=>{
    if(!r.ok) throw new Error('Fetch failed '+url);
    return await r.json();
  }).catch(e=>{
    jsonCache.delete(url);
    throw e;
  });
  jsonCache.set(url, p);
  return p;
}

/* ---------- Inject CSS inside SVG document ---------- */
function injectCSSIntoSVG(svgDoc){
  try {
    if(!svgDoc) return;
    if(svgDoc.getElementById && svgDoc.getElementById('pulse-style')) return;
    const styleEl = svgDoc.createElementNS("http://www.w3.org/2000/svg","style");
    styleEl.setAttribute("id","pulse-style");
    styleEl.textContent = `
      @keyframes pulseSector {
        0%   { transform: translateY(0px) scale(1); opacity: 0.8; }
        50%  { transform: translateY(-6px) scale(1.06); opacity: 1; }
        100% { transform: translateY(0px) scale(1); opacity: 0.8; }
      }
      .flecha-pulsando {
        animation: pulseSector 1.2s infinite ease-in-out;
        transform-origin: center;
        transform-box: fill-box;
        transition: fill 0.25s ease-out, opacity 0.25s ease-out, transform 0.25s ease-out;
      }
      .foco-pulsante {
        animation: focoPulse 0.6s infinite ease-in-out;
        transform-origin: center;
        transform-box: fill-box;
      }

    @keyframes focoPulse {
      0%   { opacity: 1;   }
      50%  { opacity: 0.5; }
      100% { opacity: 1;   }
    }
    `;
    const svg = svgDoc.querySelector('svg');
    if(svg) svg.appendChild(styleEl);
  } catch(e){
    console.warn("injectCSSIntoSVG error", e);
  }
}

/* ---------- crearZoomLayerSiHaceFalta ---------- */
function crearZoomLayerSiHaceFalta(svgDoc){
  if(!svgDoc) return null;
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

/* ---------- placeMarkers ---------- */
let allMarkers = [];
function placeMarkers(svgRoot, ubicaciones){
  allMarkers = [];
  if(!svgRoot) return;
  ubicaciones.forEach(ubicacion=>{
    const target = svgRoot.ownerDocument.getElementById(ubicacion.id);
    if(!target) return;
    if(!target.__attached){
      try { target.setAttribute("fill","transparent"); } catch(e){}
      try { target.setAttribute("stroke","white"); } catch(e){}
      try { target.setAttribute("pointer-events","all"); } catch(e){}
      target.style.cursor="pointer";
      target.dataset.nombre = (ubicacion.nombre||"").toLowerCase();
      target.addEventListener("mouseenter", ()=> target.setAttribute("fill","#CF142B"));
      target.addEventListener("mouseleave", ()=> target.setAttribute("fill","transparent"));
      target.addEventListener("click", ()=> showInfo(ubicacion));
      target.__attached = true;
    }
    allMarkers.push(target);
  });
}

/* ---------- Modal ---------- */
modalCloseBtn.addEventListener("click", ()=> modal.classList.remove("active"));
function showInfo(data){
  const modalContent = document.getElementById("modalContent");
  modalContent.innerHTML = `
    <h3>${data.nombre}</h3>
    ${data.media && data.media.video ? `<video controls style="width:100%;border-radius:10px;" autoplay loop muted><source src="${data.media.video}" type="video/mp4"></video>` : ""}
    <p><strong>Ubicación:</strong> ${data.ubicacion || ""}</p>
    <div>${data.descripcion || ""}</div>
  `;
  if(data.media && data.media.fotos && data.media.fotos.length){
    const img = document.createElement('img');
    img.src = data.media.fotos[0];
    img.alt = data.nombre;
    img.style.width = "100%";
    img.style.cursor = "pointer";
    img.addEventListener("click", ()=> openLightboxGallery(data.media.fotos));
    modalContent.appendChild(img);
  } else if(data.media && data.media.foto){
    const img = document.createElement('img');
    img.src = data.media.foto;
    img.alt = data.nombre;
    img.style.width = "100%";
    img.style.cursor = "pointer";
    img.addEventListener("click", ()=> openLightbox(data.media.foto));
    modalContent.appendChild(img);
  }
  modal.classList.add("active");
}

/* ---------- Lightbox minimal ---------- */
let lightboxImages = [], currentLightboxIndex = 0;
function openLightbox(src){ lightboxImages=[src]; currentLightboxIndex=0; document.getElementById("lightboxImg").src=src; document.getElementById("lightbox").style.display="flex"; }
function openLightboxGallery(fotos){ if(!Array.isArray(fotos)||fotos.length===0) return; lightboxImages=fotos; currentLightboxIndex=0; document.getElementById("lightboxImg").src=fotos[0]; document.getElementById("lightbox").style.display="flex"; }
document.getElementById("lightboxClose").addEventListener("click", ()=> { document.getElementById("lightbox").style.display="none"; lightboxImages=[]; });
document.getElementById("lightbox").addEventListener("click",(e)=>{ if(e.target.id==="lightbox"){ document.getElementById("lightbox").style.display="none"; lightboxImages=[]; } });

/* ---------- Search/index ---------- */
let mapsIndex = [], nameIndex = [], currentMap = null, cachedGeneralLocations = null;

function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),wait); }; }

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
      const items = await fetchJSONCached(entry.json);
      if(!items || !Array.isArray(items)) return;
      items.forEach(it=>{
        const keywords = [it.nombre||"", it.id||"", it.ubicacion||"", it.sector||""].join(" ").toLowerCase();
        nameIndex.push({ nombreLower: keywords, item: it, mapEntry: entry });
      });
    } catch(e){}
  }));
  nameIndex = nameIndex.filter((v,i,self) => i === self.findIndex(t => t.item && t.item.id === v.item.id));
}

/* ---------- Suggestions UI ---------- */
function showSuggestions(list){
  suggestionsEl.innerHTML = "";
  if(!list || list.length===0){ suggestionsEl.style.display='none'; return; }
  list.forEach(s=>{
    const li = document.createElement('li');
    const edificioClave = s.item.sector || s.mapEntry.edificio || "General";
    const edificioNombre = nombresEdificios[edificioClave] || edificioClave;
    li.textContent = `${s.item.nombre} - ${edificioNombre} - Piso ${s.mapEntry.piso}`;
    li.dataset.edificio = edificioClave;
    li.addEventListener("mouseenter", ()=> { try { highlightBuilding({ edificio: s.item.sector }); } catch(e){ console.warn("highlight err", e); } });
    li.addEventListener("mouseleave", ()=> { try { clearHighlight(); } catch(e){} });
    li.addEventListener("click", ()=> selectSuggestion(s));
    suggestionsEl.appendChild(li);
  });
  suggestionsEl.style.display='block';
}
function clearSuggestions(){ suggestionsEl.style.display='none'; suggestionsEl.innerHTML=''; }

const searchDebounced = debounce(()=>{
  let q = searchInput.value.trim().toLowerCase();
  if(!q){ clearSuggestions(); return; }
  if(alias[q]) q = alias[q];
  const starts = nameIndex.filter(n=>n.nombreLower.startsWith(q)).slice(0,10);
  const contains = nameIndex.filter(n=>n.nombreLower.includes(q) && !n.nombreLower.startsWith(q)).slice(0,10-starts.length);
  showSuggestions(starts.concat(contains));
}, 150);

searchInput.addEventListener("input", searchDebounced);

searchInput.addEventListener("keydown", e=>{
  if(e.key === "Enter"){
    let q = searchInput.value.trim().toLowerCase();
    if(!q) return;
    if(alias[q]) q = alias[q];
    const pick = nameIndex.find(n=>n.nombreLower===q) || nameIndex.find(n=>n.nombreLower.startsWith(q));
    if(pick) selectSuggestion(pick);
    clearSuggestions(); searchInput.blur();
  } else if(e.key === "Escape") clearSuggestions();
});

/* ---------- Resolve id robusto ---------- */
function resolveSvgId(key){
  if(!key) return null;
  if(idEdificiosSVG[key]) return idEdificiosSVG[key];
  const cand = [ key, key.replace(/\s+/g,"_"), key.replace(/\s+/g,"").toLowerCase(), key.toLowerCase(), key.toUpperCase() ];
  return cand[0];
}

/* ---------- Highlight / Clear (robusto) ---------- */
function highlightBuilding(mapEntry){
  try {
    const obj = document.getElementById("svgGeneral");
    if(!obj) { console.warn("svgGeneral not found"); return; }
    const svgDoc = obj.contentDocument;
    if(!svgDoc) { console.warn("svgGeneral.contentDocument not ready"); return; }

    clearHighlight();

    const rawKey = (mapEntry && mapEntry.edificio) ? mapEntry.edificio : (mapEntry || "");
    if(!rawKey) { console.warn("No key for mapEntry", mapEntry); return; }
    const candidateId = resolveSvgId(rawKey);

    let el = svgDoc.getElementById(candidateId) || svgDoc.getElementById(candidateId.toLowerCase()) || svgDoc.getElementById(candidateId.toUpperCase());
    if(!el){
      const needle = (candidateId||rawKey||"").toString().toLowerCase();
      const all = svgDoc.querySelectorAll('[id]');
      for(let i=0;i<all.length;i++){
        const id = (all[i].id||"").toString().toLowerCase();
        if(id && id.includes(needle)){
          el = all[i];
          break;
        }
      }
    }
    if(!el){ console.warn("No SVG element found for key:", candidateId||rawKey); return; }

    function applyHighlight(node){
      if(!node || node.nodeType !== 1) return;
      try {
        if(!node.hasAttribute("data-original-fill")) node.setAttribute("data-original-fill", node.getAttribute("fill") || "");
        if(!node.hasAttribute("data-original-opacity")) node.setAttribute("data-original-opacity", node.getAttribute("opacity") || (node.style && node.style.opacity) || "");
        try { node.setAttribute("fill", "#CF142B"); } catch(e){}
        try { node.setAttribute("opacity", "0.6"); } catch(e){}
        try { node.setAttribute("display", node.getAttribute("display") || "inline"); } catch(e){}
        try { node.style && (node.style.pointerEvents = "all"); } catch(e){}
      } catch(e){}
    }

    applyHighlight(el);

    if(el.children && el.children.length>0){
      const children = el.querySelectorAll("*");
      for(let i=0;i<children.length;i++) applyHighlight(children[i]);
    }

    try {
      if(el.classList) {
        el.classList.add("flecha-pulsando");
        el.style.transformBox = "fill-box";
        el.style.transformOrigin = "center";
        fixTransformOriginForElement(el);
      }

      const arrows = el.querySelectorAll('path, polygon, polyline, [id*="flecha"], [id*="arrow"], [class*="flecha"], [class*="arrow"]');
      arrows.forEach(a => {
        try {
          a.classList.add("flecha-pulsando");
          a.style.transformBox = "fill-box";
          a.style.transformOrigin = "center";
          fixTransformOriginForElement(a);
        } catch(e){}
      });
    } catch(e){}

    let parent = el.parentNode;
    while(parent && parent !== svgDoc){
      try {
        if(parent.setAttribute){
          if(!parent.hasAttribute("data-original-opacity")) parent.setAttribute("data-original-opacity", parent.getAttribute("opacity") || "");
          parent.setAttribute("opacity", parent.getAttribute("opacity") || "1");
          parent.setAttribute("display", parent.getAttribute("display") || "inline");
        }
      } catch(e){}
      parent = parent.parentNode;
    }

  } catch(err){
    console.error("highlightBuilding error:", err);
  }
}

function clearHighlight(){
  try {
    const obj = document.getElementById("svgGeneral");
    if(!obj) return;
    const svgDoc = obj.contentDocument;
    if(!svgDoc) return;

    const pulsing = svgDoc.querySelectorAll('.flecha-pulsando');
    pulsing.forEach(el=> { try{ el.classList.remove('flecha-pulsando'); }catch(e){} });

    const touched = svgDoc.querySelectorAll('[data-original-fill], [data-original-opacity]');
    touched.forEach(el=>{
      try {
        if(el.hasAttribute("data-original-fill")){
          const of = el.getAttribute("data-original-fill");
          if(of === "") el.removeAttribute("fill"); else el.setAttribute("fill", of);
          el.removeAttribute("data-original-fill");
        }
        if(el.hasAttribute("data-original-opacity")){
          const oo = el.getAttribute("data-original-opacity");
          if(oo === "") el.removeAttribute("opacity"); else el.setAttribute("opacity", oo);
          el.removeAttribute("data-original-opacity");
        }
        if(el.style) el.style.pointerEvents = "";
      } catch(e){}
    });

  } catch(err){
    console.error("clearHighlight error:", err);
  }
}

/* ---------- load SVG into object and inject CSS ---------- */
function loadSVGIntoObject(obj, url){
  if(!obj) return Promise.resolve(null);
  return new Promise(resolve=>{
    const onLoad = ()=>{
      try {
        const doc = obj.contentDocument;
        injectCSSIntoSVG(doc);
        resolve(doc);
      } catch(e){
        resolve(null);
      }
    };
    obj.addEventListener('load', onLoad, { once: true });
    obj.setAttribute('data', url);
  });
}

/* ---------- selectSuggestion ---------- */
async function selectSuggestion(entry){
  const mapEntry = entry.mapEntry;
  const objOverlay = document.getElementById("svgOverlay");
  await loadSVGIntoObject(objOverlay, mapEntry.svg);
  currentMap = mapEntry;

  try {
    const data = await fetchJSONCached(mapEntry.json);
    const svgDoc = objOverlay.contentDocument;
    injectCSSIntoSVG(svgDoc);
    const svg = svgDoc.querySelector("svg");
    if(svg){ svg.style.opacity = "1"; svg.style.visibility = "visible"; }

    let bg = svgDoc.getElementById("overlayBackground");
    if(!bg){
      bg = svgDoc.createElementNS("http://www.w3.org/2000/svg","rect");
      bg.setAttribute("id","overlayBackground");
      bg.setAttribute("x","0"); bg.setAttribute("y","0"); bg.setAttribute("width","100%"); bg.setAttribute("height","100%");
      bg.setAttribute("fill","white"); bg.setAttribute("opacity","0.1");
      svg.insertBefore(bg, svg.firstChild);
    }

    const gWrapper = crearZoomLayerSiHaceFalta(svgDoc);
    placeMarkers(gWrapper, data);

    objOverlay.style.pointerEvents = "auto";
    objOverlay.style.opacity = "1";
    objOverlay.style.visibility = "visible";
  } catch(e){
    console.error("Error cargando overlay:", e);
  }

  try { highlightBuilding({ edificio: entry.item.sector }); } catch(e){ console.warn(e); }

  focusOnLocation(entry.item);
  clearSuggestions();
  searchInput.blur();

  const general = document.getElementById("svgGeneral");
  if(general){ general.style.opacity = "0.1"; general.style.pointerEvents = "none"; }
}

/* ---------- focusOnLocation in overlay ---------- */
function focusOnLocation(ubicacion){
  const obj = document.getElementById("svgOverlay");
  if(!obj) return;
  const svgDoc = obj.contentDocument;
  if(!svgDoc) return;
  const el = svgDoc.getElementById(ubicacion.id);
  if(!el) return;
  try {
    // Limpia pulsos previos
    const svgDoc = obj.contentDocument;
    svgDoc.querySelectorAll('.foco-pulsante').forEach(n => n.classList.remove('foco-pulsante'));

    // Marca visualmente la ubicación
    el.setAttribute("fill", "#CF142B");
    el.setAttribute("opacity", "0.7");

    // Añade la clase de animación
    el.classList.add("foco-pulsante");

  } catch(e){}
  showInfo(ubicacion);
}

/* ---------- loadGeneralMap (reusable and reinjects CSS) ---------- */
async function loadGeneralMap(defaultMap){
  const objGeneral = document.getElementById("svgGeneral");
  if(!objGeneral) return;
  await new Promise(resolve=>{
    const onLoad = async ()=>{
      try {
        const svgDoc = objGeneral.contentDocument;
        injectCSSIntoSVG(svgDoc);
        try {
          const data = await fetchJSONCached(defaultMap.json);
          const gWrapper = crearZoomLayerSiHaceFalta(svgDoc);
          placeMarkers(gWrapper, data);
          inicializarColoresPlanoGeneral();
        } catch(e){
          try { inicializarColoresPlanoGeneral(); } catch(err){}
          console.warn("Error al cargar ubicaciones generales:", e);
        }
      } catch(e){ console.warn("loadGeneralMap onload err", e); }
      resolve();
    };
    objGeneral.addEventListener('load', onLoad, { once: true });
    objGeneral.setAttribute('data', defaultMap.svg);
  });
}

/* ---------- Reset button ---------- */
document.getElementById("resetViewBtn").addEventListener("click", async ()=>{
  const general = mapsIndex.find(m => (m.edificio && m.edificio.toLowerCase()==="general") || m.piso===0);
  const defaultMap = general || mapsIndex[0];
  if(!defaultMap) return;

  const objOverlay = document.getElementById("svgOverlay");
  if(objOverlay){
    // Quitar pulso de cualquier ubicación
    const svgDoc = document.getElementById("svgGeneral").contentDocument;
    if (svgDoc) {
      svgDoc.querySelectorAll('.foco-pulsante').forEach(n => n.classList.remove('foco-pulsante'));
    }
    objOverlay.removeAttribute('data');
    objOverlay.style.opacity = "0";
    objOverlay.style.visibility = "hidden";
    objOverlay.style.pointerEvents = "none";
  }

  await loadGeneralMap(defaultMap);

  const objGeneral = document.getElementById("svgGeneral");
  if(objGeneral){
    objGeneral.style.opacity = "1";
    objGeneral.style.pointerEvents = "auto";
    objGeneral.style.visibility = "visible";
  }
  modal.classList.remove("active");
  document.getElementById("searchInput").value = "";
  clearSuggestions();
  clearHighlight();
});

/* ---------- inicializarColoresPlanoGeneral ---------- */
function inicializarColoresPlanoGeneral(){
  const obj = document.getElementById("svgGeneral");
  if(!obj) return;
  const svgDoc = obj.contentDocument;
  if(!svgDoc) return;
  Object.values(idEdificiosSVG).forEach(id=>{
    try {
      const el = svgDoc.getElementById(id);
      if(el){
        if(typeof el.dataset.originalFill === "undefined"){
          el.dataset.originalFill = el.getAttribute("fill") || "";
          el.dataset.originalOpacity = el.getAttribute("opacity") || "";
        }
        el.setAttribute("fill","transparent");
        el.setAttribute("opacity","1");
        el.setAttribute("pointer-events","all");
      }
    } catch(e){}
  });
}

/* ---------- Startup ---------- */
window.addEventListener("load", async ()=>{
  await buildIndex();
  const general = mapsIndex.find(m=>(m.edificio && m.edificio.toLowerCase()==="general") || m.piso===0);
  const defaultMap = general || mapsIndex[0];
  if(!defaultMap) return;
  await loadGeneralMap(defaultMap);
});

/* ---------- small gallery helper ---------- */
let currentGalleryIndex = 0;
function moveGallery(direction){
  const slide = document.getElementById("gallerySlide");
  if(!slide) return;
  const total = slide.children.length;
  currentGalleryIndex = (currentGalleryIndex + direction + total) % total;
  slide.style.transform = `translateX(-${currentGalleryIndex * 100}%)`;
}


/* ----------------- end script ----------------- */
