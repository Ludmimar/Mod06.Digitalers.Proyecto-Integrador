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
  let resumen = `Resumen de movimientos para ${clienteActual.email}:\n\n`;

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
}

cargarDesdeLocalStorage();
