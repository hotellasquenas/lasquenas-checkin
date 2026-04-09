// ============================================================
//  config.js — Configuración global Hotel Las Quenas
//  Este archivo lo incluyen TODAS las páginas HTML
//
//  DESPUÉS de instalar el Apps Script, pega aquí la URL:
// ============================================================

const QUENAS_CONFIG = {
  // URL del Google Apps Script (la obtienes al implementar)
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyb3adQ8uDkIAO_eL-0GohR66dc86KtkX1rj4N0wWHGS1Q_TdE2Us_d2IQ4R-bSzWq93Q/exec",

  // Nombre del hotel
  HOTEL: "Hotel Las Quenas",

  // WhatsApp del hotel (para contacto directo)
  WHATSAPP: "51987341632",

  // Correo
  EMAIL: "lasquenasinn@gmail.com",

  // Dirección
  DIRECCION: "Calle Los Ángeles 1265, Santiago, Cusco, Perú",

  // Tours disponibles
  TOURS: [
    { id: "machu_picchu",    nombre: "Machu Picchu",       icono: "mountain_flag" },
    { id: "valle_sagrado",   nombre: "Valle Sagrado",      icono: "landscape"     },
    { id: "vinicunca",       nombre: "Montaña Vinicunca",  icono: "palette"       },
    { id: "saqsaywaman",     nombre: "Saqsaywaman",        icono: "fort"          },
    { id: "humantay",        nombre: "Laguna Humantay",    icono: "water"         },
    { id: "city_tour",       nombre: "City Tour Cusco",    icono: "location_city" }
  ]
};

// ── Helper: leer parámetro de la URL ─────────────────────────
function getParam(nombre) {
  const url = new URL(window.location.href);
  return url.searchParams.get(nombre);
}

// ── Helper: guardar datos en localStorage por reserva ────────
function guardarDatos(key, valor) {
  const id = getParam("r") || "sin_reserva";
  localStorage.setItem("quenas_" + id + "_" + key, JSON.stringify(valor));
}

function cargarDatos(key) {
  const id = getParam("r") || "sin_reserva";
  const raw = localStorage.getItem("quenas_" + id + "_" + key);
  return raw ? JSON.parse(raw) : null;
}

// ── Helper: enviar datos al Apps Script ──────────────────────
async function enviarAScript(payload) {
  const resp = await fetch(QUENAS_CONFIG.SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "text/plain" }  // evita preflight CORS
  });
  return await resp.json();
}

// ── Helper: convertir imagen a AVIF en el navegador ──────────
async function convertirAAvif(file, maxKB = 150) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // Reducir resolución si es muy grande
      let w = img.width, h = img.height;
      const MAX = 1200;
      if (w > MAX || h > MAX) {
        const ratio = Math.min(MAX / w, MAX / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);

      // Intentar AVIF primero, caer en WebP si no soporta
      const formato = canvas.toDataURL("image/avif").startsWith("data:image/avif")
        ? "image/avif" : "image/webp";

      // Calidad adaptativa para no superar maxKB
      let calidad = 0.85;
      let dataUrl = canvas.toDataURL(formato, calidad);

      // Reducir calidad hasta cumplir el límite
      while (dataUrl.length * 0.75 > maxKB * 1024 && calidad > 0.3) {
        calidad -= 0.1;
        dataUrl = canvas.toDataURL(formato, calidad);
      }

      resolve({ dataUrl, formato, w, h, calidad: Math.round(calidad * 100) });
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Helper: mostrar toast de notificación ───────────────────
function mostrarToast(msg, tipo = "ok") {
  const t = document.createElement("div");
  t.className = "quenas-toast";
  t.textContent = msg;
  t.style.cssText = `
    position:fixed; bottom:100px; left:50%; transform:translateX(-50%);
    background:${tipo === "ok" ? "#755b00" : "#ba1a1a"};
    color:white; padding:12px 24px; border-radius:100px;
    font-family:'Work Sans',sans-serif; font-size:14px;
    z-index:9999; box-shadow:0 4px 20px rgba(0,0,0,0.2);
    animation: toastIn .3s ease;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// CSS para el toast
const toastStyle = document.createElement("style");
toastStyle.textContent = `@keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(20px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }`;
document.head.appendChild(toastStyle);
