# La Molienda — Café & Bar | Sistema POS, Mesas & Control de Inventario

Sistema integral de punto de venta (POS), control de cuentas por mesa y gestión de inventario en tiempo real diseñado específicamente para establecimientos de café de especialidad, gastrobares y coctelería de autor.

Desarrollado con **React 19 + TypeScript + Vite + Electron**, conservando la estructura de espacios, navegación intuitiva por pestañas segmentadas, métricas en tiempo real y persistencia local (`localStorage`).

---

## ☕ Módulos y Flujo Operativo Profesional

### 1. Control de Mesas & Cuentas (Salón, Terraza, Barra & Takeaway)
- **Plano Visual por Zonas**: Salón Principal, Terraza Exterior, Barra Café & Coctelería y Para Llevar (Takeaway).
- **Semáforo de Estados**:
  - 🟢 **Libre**: Lista para asignación.
  - 🟡 **Ocupada (Consumiendo)**: Cuenta viva, tiempo de estadía en tiempo real (ej. `38m`) y comensales asignados.
  - 🔵 **Pre-cuenta Entregada**: El cliente solicitó la cuenta para revisión previa al cobro.
- **Gestión de Comanda en Mesa**:
  - Modificación de cantidades en vivo (`+` / `-`).
  - Notas de preparación personalizadas por ítem (ej. *"Leche deslactosada"*, *"Sin azúcar"*, *"Doble shot"*, *"Poco hielo"*).
  - Estado de rondas: *Por despachar* y *Servido*.
  - Botón **"Enviar a Barra"** para despachar rondas de bebidas y platillos a la estación de barista o mixólogo.
- **Herramientas de Servicio**:
  - **Dividir Cuenta**: Cálculo automático entre 2 a 8+ personas para pagos compartidos.
  - **Cambiar Mesa**: Traslado íntegro de la comanda a otra mesa libre sin perder el pedido.
  - **Pre-cuenta Térmica**: Impresión y previsualización de ticket de comanda.
  - **Cobro de Cuenta**: Apertura directa del módulo de facturación.

### 2. Punto de Venta Rápido (POS & Menú Visual)
- **Catálogo Visual de Alta Calidad**:
  - Fotografía gastronómica de cada café, cóctel, cerveza, postre o desayuno.
  - **Precio de venta destacado** de forma visible y clara en cada tarjeta.
  - Badge de disponibilidad de inventario (`En Stock`, `Stock Bajo`, `Agotado`).
- **Filtros por Categorías Gastronómicas**:
  - ☕ Café & Especialidad
  - 🍸 Cócteles de Autor
  - 🍺 Cervezas & Vinos
  - 🥐 Panadería & Repostería
  - 🥑 Desayunos & Brunch
  - 🍹 Bebidas Frías & Sodas
  - 🧀 Tapas & Picadas
- **Buscador en Tiempo Real** por nombre, código o ingrediente.
- **Panel Lateral de Comanda Activa**: Permite cargar productos a una mesa abierta o realizar una **Venta Rápida / Llevar** directa.

### 3. Gestión de Inventario, Costos & Definición de Precios
- **Definición de Precios de Venta ($)**:
  - Edición en línea instantánea haciendo click en el precio de cualquier producto.
  - Formulario modal completo para registrar nuevos productos o modificar los existentes.
- **Control de Rentabilidad**:
  - Cálculo automático en tiempo real del **Margen Bruto de Utilidad (%)**: `((Precio - Costo) / Precio) * 100`.
  - Cálculo de la **Ganancia Unitaria ($)**.
- **Control de Stock & Alertas**:
  - Barra de progreso de nivel de existencias.
  - Alerta de stock mínimo configurable por producto.
  - Botones de **ajuste rápido `[-1]` y `[+1]`** para mermas o reposición en barra.
- **Galería de Imágenes**:
  - Selección rápida entre presets fotográficos de alta resolución.
  - Carga por URL o subida de archivo local (`base64`).

### 4. Caja, Facturación & Arqueo del Turno
- **Múltiples Medios de Pago**:
  - 💵 **Efectivo**: Calculadora con botones rápidos de billetes ($20.000, $50.000, $100.000, exacto) y cálculo automático instantáneo de **Cambio / Vueltos**.
  - 💳 **Datáfono / Tarjeta**: Registro de código de autorización / voucher.
  - 📱 **QR / Transferencias**: Registro de comprobante de Bancolombia QR, Nequi o Daviplata.
  - 🔀 **Pago Mixto**: Combinación de efectivo y electrónico.
- **Manejo de Propina Voluntaria**: Opciones de 0%, 10% sugerido, 15% o valor personalizado.
- **Descuento Automático de Inventario**: Al completar una venta, el stock de cada producto consumido se deduce en tiempo real.
- **Cierre de Turno & Arqueo de Caja**:
  - Comparativo entre el efectivo teórico del sistema y el dinero físico contado en el cajón.
  - Indicador visual de caja cuadrada, sobrante o faltante.
  - Acta de arqueo imprimible.

### 5. Ticket Térmico de 80mm & Exportación a Excel
- **Visor de Ticket Térmico (80mm)**:
  - Formato idéntico al de impresoras de comandas POS.
  - Datos de NIT, dirección, teléfono, red WiFi y clave para comensales.
  - Desglose de ítems, notas, propina, totales y medio de pago.
  - Compatible con impresión directa (`Ctrl + P` / `@media print`).
- **Exportación a Excel Multicapa (`.xlsx`) con ExcelJS**:
  - Hoja 1: **Historial de Ventas** (Tickets, mesas, mesero, subtotales, propinas, total).
  - Hoja 2: **Inventario & Precios** (Costos, precios de venta, márgenes %, stock y estado).
  - Hoja 3: **Cierre de Caja & Arqueo** (Cuadre por método de pago y propinas).

---

## 🎨 Diseño & Estética

- **Paleta Dark Espresso**: Fondo obsidiana café (`#0e0b08`), acentos dorados y ámbar (`#f59e0b`, `#d97706`), verdes esmeralda (`#10b981`) y tipografía crema (`Plus Jakarta Sans` y `JetBrains Mono`).
- **Paleta Light Crema**: Modo claro elegante simulando papel craft y crema de café.
- **Estructura de Espacios Preservada**:
  - Barra superior fija con Logo, Selector de Espacios, Selector de Barista y Cambio de Tema.
  - Franja superior de Tarjetas KPI en vivo.
  - Contenedor de espacio de trabajo activo con transiciones fluidas.
  - Modales flotantes estilizados con desenfoque de fondo (`backdrop-filter`).

---

## 💻 Ejecución del Proyecto

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo web
npm run dev

# Compilar para producción web
npm run build

# Ejecutar como aplicación de escritorio (Electron)
npm run electron:dev
```
