const loginScreen = document.querySelector("#loginScreen");
const appContent = document.querySelector("#appContent");
const loginForm = document.querySelector("#loginForm");
const loginUserInput = document.querySelector("#loginUser");
const loginPasswordInput = document.querySelector("#loginPassword");
const loginError = document.querySelector("#loginError");
const logoutBtn = document.querySelector("#logoutBtn");
const form = document.querySelector("#ventaForm");
const fechaInput = document.querySelector("#fecha");
const personaInput = document.querySelector("#persona");
const articuloInput = document.querySelector("#articulo");
const montoDebeInput = document.querySelector("#montoDebe");
const montoAbonoInput = document.querySelector("#montoAbono");
const tablaRegistros = document.querySelector("#tablaRegistros");
const busquedaInput = document.querySelector("#busqueda");
const limpiarTodoBtn = document.querySelector("#limpiarTodo");
const totalVendidoEl = document.querySelector("#totalVendido");
const totalAbonadoEl = document.querySelector("#totalAbonado");
const saldoPendienteEl = document.querySelector("#saldoPendiente");
const summaryNote = document.querySelector("#summaryNote");

const STORAGE_KEY = "ventasRevista";
const SESSION_KEY = "ventasRevistaSesion";
const USER_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
const PASSWORD_HASH = "a2d1b3d9a2858643049831167a2391f7d4d3a674347a3ccaf72e85dbda1698bb";

let registros = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

const formatoMoneda = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
});

async function generarHash(texto) {
  const datos = new TextEncoder().encode(texto);
  const hashBuffer = await crypto.subtle.digest("SHA-256", datos);
  const bytes = Array.from(new Uint8Array(hashBuffer));

  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function mostrarApp() {
  loginScreen.hidden = true;
  appContent.hidden = false;
  fechaInput.valueAsDate = new Date();
  renderizar();
}

function mostrarLogin() {
  loginScreen.hidden = false;
  appContent.hidden = true;
  loginPasswordInput.value = "";
  loginUserInput.focus();
}

function guardarRegistros() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

function obtenerNumero(input) {
  return Number.parseFloat(input.value) || 0;
}

function normalizarTexto(texto) {
  return texto.trim().toLowerCase();
}

function crearId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function obtenerFiltro() {
  return normalizarTexto(busquedaInput.value);
}

function obtenerRegistrosFiltrados() {
  const filtro = obtenerFiltro();

  if (!filtro) {
    return registros;
  }

  return registros.filter((registro) => {
    const persona = normalizarTexto(registro.persona);
    const articulo = normalizarTexto(registro.articulo);

    return persona.includes(filtro) || articulo.includes(filtro);
  });
}

function renderizarResumen(registrosVisibles) {
  const filtro = busquedaInput.value.trim();
  const totalVendido = registrosVisibles.reduce((total, registro) => total + registro.debe, 0);
  const totalAbonado = registrosVisibles.reduce((total, registro) => total + registro.abonado, 0);
  const saldoPendiente = totalVendido - totalAbonado;

  totalVendidoEl.textContent = formatoMoneda.format(totalVendido);
  totalAbonadoEl.textContent = formatoMoneda.format(totalAbonado);
  saldoPendienteEl.textContent = formatoMoneda.format(saldoPendiente);

  summaryNote.textContent = filtro
    ? `Mostrando resumen de "${filtro}": ${registrosVisibles.length} registro(s).`
    : "Mostrando resumen general.";
}

function renderizarTabla(registrosVisibles) {
  tablaRegistros.innerHTML = "";

  if (registrosVisibles.length === 0) {
    tablaRegistros.innerHTML = '<tr><td colspan="7" class="empty-state">No hay registros para mostrar.</td></tr>';
    return;
  }

  registrosVisibles.forEach((registro) => {
    const saldo = registro.debe - registro.abonado;
    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td data-label="Fecha">${registro.fecha}</td>
      <td data-label="Persona">${registro.persona}</td>
      <td data-label="Articulo">${registro.articulo || "Sin detalle"}</td>
      <td data-label="Debe" class="amount">${formatoMoneda.format(registro.debe)}</td>
      <td data-label="Abonado" class="amount">${formatoMoneda.format(registro.abonado)}</td>
      <td data-label="Saldo" class="amount ${saldo <= 0 ? "balance-ok" : "balance-due"}">${formatoMoneda.format(saldo)}</td>
      <td data-label="Accion"><button class="delete-button" type="button" data-id="${registro.id}">Eliminar</button></td>
    `;

    tablaRegistros.appendChild(fila);
  });
}

function renderizar() {
  const registrosVisibles = obtenerRegistrosFiltrados();

  renderizarResumen(registrosVisibles);
  renderizarTabla(registrosVisibles);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";

  const userHash = await generarHash(loginUserInput.value.trim());
  const passwordHash = await generarHash(loginPasswordInput.value);
  const credencialesValidas = userHash === USER_HASH && passwordHash === PASSWORD_HASH;

  if (!credencialesValidas) {
    loginError.textContent = "Usuario o contrasena incorrectos.";
    loginPasswordInput.value = "";
    loginPasswordInput.focus();
    return;
  }

  sessionStorage.setItem(SESSION_KEY, "activa");
  loginForm.reset();
  mostrarApp();
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  mostrarLogin();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const debe = obtenerNumero(montoDebeInput);
  const abonado = obtenerNumero(montoAbonoInput);

  if (debe === 0 && abonado === 0) {
    alert("Ingresa un monto a deber o un monto abonado.");
    return;
  }

  registros.push({
    id: crearId(),
    fecha: fechaInput.value,
    persona: personaInput.value.trim(),
    articulo: articuloInput.value.trim(),
    debe,
    abonado,
  });

  guardarRegistros();
  renderizar();
  form.reset();
  fechaInput.valueAsDate = new Date();
  personaInput.focus();
});

tablaRegistros.addEventListener("click", (event) => {
  const boton = event.target.closest(".delete-button");

  if (!boton) {
    return;
  }

  registros = registros.filter((registro) => registro.id !== boton.dataset.id);
  guardarRegistros();
  renderizar();
});

busquedaInput.addEventListener("input", renderizar);

limpiarTodoBtn.addEventListener("click", () => {
  if (!registros.length) {
    return;
  }

  const confirmar = confirm("Quieres eliminar todos los registros?");

  if (confirmar) {
    registros = [];
    guardarRegistros();
    renderizar();
  }
});

if (sessionStorage.getItem(SESSION_KEY) === "activa") {
  mostrarApp();
} else {
  mostrarLogin();
}
