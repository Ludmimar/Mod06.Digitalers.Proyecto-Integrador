const clientes = [];
let clienteActual = null;

function mostrarMensaje(texto) {
  const div = document.getElementById("mensaje");
  div.innerText = texto;
  div.style.display = "block";
  setTimeout(() => {
    div.style.display = "none";
    div.innerText = "";
  }, 4000);
}

// Serializar sin referencias circulares para guardar en localStorage
function guardarEnLocalStorage() {
  const clientesParaGuardar = clientes.map(cliente => ({
    id: cliente.id,
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    dni: cliente.dni,
    email: cliente.email,
    password: cliente.password,
    cuentas: cliente.cuentas.map(cuenta => ({
      codigo: cuenta.codigo,
      saldo: cuenta.saldo,
      movimientos: cuenta.movimientos.map(mov => ({
        tipo: mov.tipo,
        monto: mov.monto,
        fecha: mov.fecha.toISOString()
      }))
    }))
  }));

  localStorage.setItem("clientes", JSON.stringify(clientesParaGuardar));

  if(clienteActual) {
    localStorage.setItem("clienteActualEmail", clienteActual.email);
  } else {
    localStorage.removeItem("clienteActualEmail");
  }
}

// Cargar y reconstruir objetos desde localStorage
function cargarDesdeLocalStorage() {
  const data = localStorage.getItem("clientes");
  if(data) {
    const clientesGuardados = JSON.parse(data);
    clientesGuardados.forEach(c => {
      const cliente = new Cliente(c.id, c.nombre, c.apellido, c.dni, c.email, c.password);
      c.cuentas.forEach(cuentaData => {
        const cuenta = new Cuenta(cuentaData.codigo, cuentaData.saldo);
        cuentaData.movimientos.forEach(m => {
          const movimiento = new Movimiento(m.tipo, m.monto);
          movimiento.fecha = new Date(m.fecha);
          cuenta.movimientos.push(movimiento);
        });
        cliente.agregarCuenta(cuenta);
      });
      clientes.push(cliente);
    });
  }

  const emailGuardado = localStorage.getItem("clienteActualEmail");
  if(emailGuardado) {
    const cliente = clientes.find(c => c.email === emailGuardado);
    if(cliente) {
      clienteActual = cliente;
      document.getElementById("login").style.display = "none";
      document.getElementById("registro").style.display = "none";
      document.getElementById("dashboard").style.display = "block";
      document.getElementById("usuarioEmail").innerText = cliente.email;
      actualizarResumenCuentas();
      mostrarResumenMovimientos();
      mostrarMensaje(`Bienvenido nuevamente, ${cliente.nombre}`);
    }
  }

  actualizarVisibilidadBotonLimpiar();
}

function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const cliente = clientes.find(c => c.email === email && c.password === password);
  if(cliente) {
    clienteActual = cliente;
    document.getElementById('login').style.display = 'none';
    document.getElementById('registro').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('usuarioEmail').innerText = cliente.email;
    actualizarResumenCuentas();
    mostrarResumenMovimientos();
    mostrarMensaje(`Bienvenido, ${cliente.nombre}`);
    guardarEnLocalStorage();
  } else {
    mostrarMensaje("Credenciales incorrectas o usuario no registrado.");
  }
  actualizarVisibilidadBotonLimpiar();
}

function registrarCliente() {
  const nombre = document.getElementById("nombre").value.trim();
  const apellido = document.getElementById("apellido").value.trim();
  const dni = document.getElementById("dni").value.trim();
  const email = document.getElementById("nuevoEmail").value.trim();
  const password = document.getElementById("nuevoPassword").value.trim();

  if(!nombre || !apellido || !dni || !email || !password) {
    mostrarMensaje("Todos los campos son obligatorios.");
    return;
  }

  if(clientes.some(c => c.email === email)) {
    mostrarMensaje("Ya existe un cliente con ese correo electrónico.");
    return;
  }

  const id = "C" + Math.floor(Math.random() * 10000);
  const nuevoCliente = new Cliente(id, nombre, apellido, dni, email, password);
  clientes.push(nuevoCliente);
  mostrarMensaje("Registro exitoso. Ahora podés iniciar sesión.");
  guardarEnLocalStorage();

  // Limpiar formulario
  document.getElementById("nombre").value = "";
  document.getElementById("apellido").value = "";
  document.getElementById("dni").value = "";
  document.getElementById("nuevoEmail").value = "";
  document.getElementById("nuevoPassword").value = "";

  actualizarVisibilidadBotonLimpiar();
}

function mostrarFormularioCuenta() {
  document.getElementById("formCuenta").style.display = "block";
}

function crearCuenta() {
  const monto = document.getElementById("saldoInicial").value;
  if(isNaN(monto) || monto.trim() === "" || parseFloat(monto) < 0) {
    mostrarMensaje("Monto inválido.");
    return;
  }

  const codigo = "CTA" + Math.floor(Math.random() * 10000);
  const nuevaCuenta = new Cuenta(codigo, parseFloat(monto));
  clienteActual.agregarCuenta(nuevaCuenta);
  mostrarMensaje(`Cuenta creada con código: ${codigo}`);
  guardarEnLocalStorage();
  actualizarResumenCuentas();
  document.getElementById("formCuenta").style.display = "none";
  document.getElementById("saldoInicial").value = "";
}

function mostrarFormularioMovimiento() {
  document.getElementById("formMovimiento").style.display = "block";
}

function realizarMovimiento() {
  const codigoCuenta = document.getElementById("codigoMovimiento").value.trim();
  const tipo = document.getElementById("tipoMovimiento").value;
  const monto = parseFloat(document.getElementById("montoMovimiento").value);
  const cuenta = clienteActual.cuentas.find(c => c.codigo === codigoCuenta);

  if(!cuenta) {
    mostrarMensaje("Cuenta no encontrada.");
    return;
  }

  if(isNaN(monto) || monto <= 0) {
    mostrarMensaje("Monto inválido.");
    return;
  }

  if(tipo === "retiro" && monto > cuenta.saldo) {
    mostrarMensaje("Fondos insuficientes para el retiro.");
    return;
  }

  if(tipo === "deposito") {
    cuenta.depositar(monto);
    mostrarMensaje("Depósito realizado.");
  } else {
    cuenta.retirar(monto);
    mostrarMensaje("Retiro realizado.");
  }

  guardarEnLocalStorage();
  actualizarResumenCuentas();

  document.getElementById("formMovimiento").style.display = "none";
  document.getElementById("codigoMovimiento").value = "";
  document.getElementById("montoMovimiento").value = "";

  mostrarResumenMovimientos();
}

function mostrarResumenMovimientos() {
  let resumen = `Resumen de movimientos para ${clienteActual.nombre} ${clienteActual.apellido}:\n\n`;

  clienteActual.cuentas.forEach(cuenta => {
    resumen += `Cuenta ${cuenta.codigo}:\n`;
    cuenta.movimientos.slice(-5).reverse().forEach(mov => {
      resumen += `  - ${mov.tipo.toUpperCase()} $${mov.monto} (${mov.fecha.toLocaleString()})\n`;
    });
    resumen += "\n";
  });

  document.getElementById("resultados").innerText = resumen;
}

function actualizarResumenCuentas() {
  const contenedor = document.getElementById("listaCuentas");
  contenedor.innerHTML = "";

  if(!clienteActual || clienteActual.cuentas.length === 0) {
    contenedor.innerText = "Aún no tenés cuentas creadas.";
    return;
  }

  clienteActual.cuentas.forEach(cuenta => {
    const div = document.createElement("div");
    div.innerText = `Cuenta: ${cuenta.codigo} | Saldo: $${cuenta.consultarSaldo().toFixed(2)}`;
    contenedor.appendChild(div);
  });
}

function logout() {
  clienteActual = null;
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("login").style.display = "block";
  document.getElementById("registro").style.display = "block";
  document.getElementById("formCuenta").style.display = "none";
  document.getElementById("formMovimiento").style.display = "none";
  document.getElementById("email").value = "";
  document.getElementById("password").value = "";
  document.getElementById("resultados").innerText = "";
  mostrarMensaje("Sesión cerrada correctamente.");
  guardarEnLocalStorage();

  actualizarVisibilidadBotonLimpiar();
  // 🧽 Limpiar usuarios listados
  document.getElementById("listaUsuarios").innerHTML = "";

}

function mostrarFormularioTransferencia() {
  document.getElementById("formTransferencia").style.display = "block";
}

function realizarTransferencia() {
  const cuentaOrigenCodigo = document.getElementById("cuentaOrigen").value.trim();
  const emailDestino = document.getElementById("emailDestino").value.trim();
  const cuentaDestinoCodigo = document.getElementById("cuentaDestino").value.trim();
  const monto = parseFloat(document.getElementById("montoTransferencia").value);

  const cuentaOrigen = clienteActual.cuentas.find(c => c.codigo === cuentaOrigenCodigo);

  if (!cuentaOrigen) {
    mostrarMensaje("Cuenta origen no encontrada.");
    return;
  }

  if (isNaN(monto) || monto <= 0) {
    mostrarMensaje("Monto inválido.");
    return;
  }

  if (monto > cuentaOrigen.saldo) {
    mostrarMensaje("Saldo insuficiente.");
    return;
  }

  const clienteDestino = clientes.find(c => c.email === emailDestino);
  if (!clienteDestino) {
    mostrarMensaje("Usuario destino no encontrado.");
    return;
  }

  const cuentaDestino = clienteDestino.cuentas.find(c => c.codigo === cuentaDestinoCodigo);
  if (!cuentaDestino) {
    mostrarMensaje("Cuenta destino no encontrada.");
    return;
  }

  // Realizar la transferencia
  cuentaOrigen.saldo -= monto;
  cuentaOrigen.movimientos.push(new Movimiento('transferencia saliente', monto));
  // Agregar movimiento como "transferencia" en la cuenta destino
  cuentaDestino.saldo += monto;
  cuentaDestino.movimientos.push(new Movimiento('transferencia recibida', monto));

  mostrarMensaje("Transferencia realizada con éxito.");
  guardarEnLocalStorage();
  actualizarResumenCuentas();
  mostrarResumenMovimientos();

  // Ocultar y limpiar el formulario
  document.getElementById("formTransferencia").style.display = "none";
  document.getElementById("cuentaOrigen").value = "";
  document.getElementById("emailDestino").value = "";
  document.getElementById("cuentaDestino").value = "";
  document.getElementById("montoTransferencia").value = "";
}

function limpiarLocalStorage() {
  if (confirm("¿Estás seguro que querés borrar todos los datos? Esta acción es irreversible.")) {
    localStorage.clear();
    location.reload(); // Recarga la página para aplicar los cambios
  }
}

// Mostrar u ocultar botón limpiar según estado de sesión
function actualizarVisibilidadBotonLimpiar() {
  const boton = document.getElementById("botonLimpiar");
  const verUsuarios = document.getElementById("verUsuarios");

  if (clienteActual) {
    boton.style.display = "none";
    verUsuarios.style.display = "none";
  } else {
    boton.style.display = "block";
    verUsuarios.style.display = "block";
  }
}


function mostrarUsuariosRegistrados() {
  const contenedor = document.getElementById("listaUsuarios");
  contenedor.innerHTML = "";

  if (clientes.length === 0) {
    contenedor.innerText = "No hay usuarios registrados.";
    return;
  }

  clientes.forEach(c => {
    const p = document.createElement("p");
    p.innerText = `Email: ${c.email} | Contraseña: ${c.password}`;
    contenedor.appendChild(p);
  });
}

cargarDesdeLocalStorage();

