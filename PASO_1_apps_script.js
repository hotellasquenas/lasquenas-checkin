// ============================================================
//  HOTEL LAS QUENAS — Google Apps Script Backend
//  Cuenta: lasquenasinn@gmail.com
//
//  INSTRUCCIONES DE INSTALACIÓN (solo una vez):
//  1. Ve a https://script.google.com
//  2. Clic en "Nuevo proyecto"
//  3. Pega TODO este código (reemplaza lo que hay)
//  4. Cambia SHEET_ID y FOLDER_ID con tus valores reales (ver paso 2 abajo)
//  5. Clic en "Implementar" → "Nueva implementación"
//  6. Tipo: "Aplicación web"
//  7. Ejecutar como: "Yo (lasquenasinn@gmail.com)"
//  8. Quién tiene acceso: "Cualquier persona"
//  9. Clic "Implementar" → copia la URL que te da → ponla en config.js
// ============================================================

// ── CONFIGURACIÓN ──────────────────────────────────────────
// PASO 2: Crea una Google Sheet en drive.google.com
//         La URL será: docs.google.com/spreadsheets/d/XXXXXXX/edit
//         Copia ese XXXXXXX aquí:
const SHEET_ID = "1djP66x0YJu9FmSyJwYS-iEnihe8lqpTapAFiEGbSRzo";

// PASO 3: Crea una carpeta en Google Drive llamada "Quenas-DNI-Fotos"
//         Abre la carpeta → la URL termina en /folders/XXXXXXX
//         Copia ese XXXXXXX aquí:
const FOLDER_ID = "10lLc4A0i3xt--51oNA4_r2XYwVLPJZ0F";

// ── CABECERAS DE LA HOJA ────────────────────────────────────
const HEADERS = [
  "ID Reserva", "Fecha Registro", "Estado",
  "Nombre Titular", "Email", "Teléfono", "Contacto Preferido",
  "País Origen", "Nro Documento Titular", "Foto DNI Titular (URL)",
  "Acompañantes (JSON)",
  "Fecha Llegada", "Aerolínea", "Nro Vuelo", "Hora Estimada",
  "Tours Interesados",
  "Notas Especiales"
];

// ── PUNTO DE ENTRADA PRINCIPAL ──────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === "registrar_huesped") {
      return registrarHuesped(data);
    } else if (action === "subir_foto") {
      return subirFoto(data);
    } else if (action === "obtener_reservas") {
      return obtenerReservas();
    } else if (action === "actualizar_estado") {
      return actualizarEstado(data);
    }

    return respuesta({ ok: false, error: "Acción desconocida" });
  } catch (err) {
    return respuesta({ ok: false, error: err.toString() });
  }
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === "obtener_reservas") return obtenerReservas();
  if (action === "ping") return respuesta({ ok: true, msg: "Las Quenas Backend activo" });
  return respuesta({ ok: false, error: "GET no soportado para esta acción" });
}

// ── REGISTRAR HUÉSPED ───────────────────────────────────────
function registrarHuesped(data) {
  const sheet = obtenerHoja();
  const ahora = new Date();
  const idReserva = data.id_reserva || ("QNS-" + ahora.getFullYear() + "-" + String(Math.floor(Math.random() * 9000) + 1000));

  const fila = [
    idReserva,
    Utilities.formatDate(ahora, "America/Lima", "dd/MM/yyyy HH:mm"),
    "Registrado",
    data.nombre_titular || "",
    data.email || "",
    data.telefono || "",
    data.contacto_preferido || "WhatsApp",
    data.pais || "PE",
    data.nro_documento || "",
    "",  // URL foto — se completa al subir foto
    JSON.stringify(data.acompanantes || []),
    data.fecha_llegada || "",
    data.aerolinea || "",
    data.nro_vuelo || "",
    data.hora_estimada || "",
    (data.tours || []).join(", "),
    data.notas || ""
  ];

  sheet.appendRow(fila);

  return respuesta({
    ok: true,
    id_reserva: idReserva,
    msg: "Registro guardado correctamente"
  });
}

// ── SUBIR FOTO (base64 → Drive) ─────────────────────────────
function subirFoto(data) {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const nombreArchivo = data.id_reserva + "_" + (data.tipo || "dni") + "_" + data.indice + ".avif";

  // Decodificar base64
  const base64 = data.foto_base64.replace(/^data:image\/[a-z]+;base64,/, "");
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, "image/avif", nombreArchivo);

  // Subir a Drive
  const archivo = folder.createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = "https://drive.google.com/file/d/" + archivo.getId() + "/view";

  // Actualizar URL en Sheets
  const sheet = obtenerHoja();
  const filas = sheet.getDataRange().getValues();
  for (let i = 1; i < filas.length; i++) {
    if (filas[i][0] === data.id_reserva) {
      const urlsActuales = sheet.getRange(i + 1, 10).getValue();
      const nuevaUrl = urlsActuales ? urlsActuales + " | " + url : url;
      sheet.getRange(i + 1, 10).setValue(nuevaUrl);
      break;
    }
  }

  return respuesta({ ok: true, url: url, msg: "Foto guardada en Drive" });
}

// ── OBTENER RESERVAS (para el admin panel) ──────────────────
function obtenerReservas() {
  const sheet = obtenerHoja();
  const datos = sheet.getDataRange().getValues();

  if (datos.length <= 1) {
    return respuesta({ ok: true, reservas: [] });
  }

  const reservas = datos.slice(1).map(fila => ({
    id_reserva:        fila[0],
    fecha_registro:    fila[1],
    estado:            fila[2],
    nombre_titular:    fila[3],
    email:             fila[4],
    telefono:          fila[5],
    contacto:          fila[6],
    pais:              fila[7],
    nro_documento:     fila[8],
    foto_url:          fila[9],
    acompanantes:      fila[10] ? JSON.parse(fila[10]) : [],
    fecha_llegada:     fila[11],
    aerolinea:         fila[12],
    nro_vuelo:         fila[13],
    hora_estimada:     fila[14],
    tours:             fila[15],
    notas:             fila[16]
  }));

  return respuesta({ ok: true, reservas: reservas });
}

// ── ACTUALIZAR ESTADO ───────────────────────────────────────
function actualizarEstado(data) {
  const sheet = obtenerHoja();
  const filas = sheet.getDataRange().getValues();

  for (let i = 1; i < filas.length; i++) {
    if (filas[i][0] === data.id_reserva) {
      sheet.getRange(i + 1, 3).setValue(data.estado);
      return respuesta({ ok: true, msg: "Estado actualizado" });
    }
  }

  return respuesta({ ok: false, error: "Reserva no encontrada" });
}

// ── HELPERS ─────────────────────────────────────────────────
function obtenerHoja() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName("Huéspedes");

  if (!sheet) {
    sheet = ss.insertSheet("Huéspedes");
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setBackground("#755b00")
      .setFontColor("#ffffff")
      .setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function respuesta(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
