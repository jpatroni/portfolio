/// ==========================================================================
/// Fondo animado "planeta de partículas con anillo" (estilo galaxia 3D)
/// Canvas 2D puro, sin librerías. Se ubica fijo detrás de todo el sitio.
/// ==========================================================================
(function () {
  "use strict";

  /// --- Configuración: ajustá acá el efecto -------------------------------
  var CONFIG = {
    /// Cantidad de partículas
    particlesSphere: 4000,   /// puntos sobre la superficie del planeta
    particlesRing: 9000,     /// puntos del disco / anillo
    particlesStars: 400,     /// estrellas lejanas

    /// Forma (unidades 3D; el planeta mide 1)
    sphereRadius: 1,
    ringInner: 1.3,          /// dónde empieza el anillo
    ringOuter: 5.5,          /// dónde termina el anillo
    ringFalloff: 1.8,        /// > 1 = más denso cerca del planeta
    ringThickness: 0.05,     /// grosor vertical del anillo

    /// Cámara
    cameraDistance: 3.4,     /// más alto = más lejos (menos perspectiva)
    rotationSpeed: 0.00010,  /// giro en Y (radianes por milisegundo)
    tiltBase: 0.28,          /// inclinación media (0 = anillo de canto)
    tiltAmplitude: 0.26,     /// cuánto oscila la inclinación
    tiltSpeed: 0.00008,      /// velocidad de la oscilación

    /// Ubicación y tamaño en pantalla
    wideBreakpoint: 900,     /// desde este ancho el planeta se corre a la derecha
    centerXWide: 0.60,       /// 60% del ancho
    centerYWide: 0.52,       /// 52% del alto
    centerXNarrow: 0.50,
    centerYNarrow: 0.45,
    scale: 0.30,             /// tamaño relativo al lado menor de la ventana

    /// Halo radial detrás del planeta
    haloRadius: 2.2,         /// en radios del planeta
    haloAlpha: 0.22,

    /// Rendimiento
    maxPixelRatio: 2
  };

  /// Paleta del portfolio
  var PALETTE = {
    lila: [180, 120, 255],
    rosa: [255, 122, 162],
    durazno: [248, 177, 149],
    estrella: [255, 236, 244]   /// blanco rosado
  };

  var canvas = document.getElementById("galaxia-bg");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  /// Quien prefiere menos movimiento ve un solo cuadro estático
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /// Partículas en arrays planos (más rápido que un objeto por punto)
  var total = CONFIG.particlesSphere + CONFIG.particlesRing + CONFIG.particlesStars;
  var px = new Float32Array(total);
  var py = new Float32Array(total);
  var pz = new Float32Array(total);
  var psize = new Float32Array(total);
  var pcolor = new Array(total);   /// string "rgba(...)" precalculado

  var width = 0, height = 0;
  var rafId = 0;

  /// Mezcla lineal entre dos colores RGB
  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  function rgba(c, alpha) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha.toFixed(3) + ")";
  }

  /// Genera todas las partículas una sola vez
  function build() {
    var i = 0, n, u, theta, ring, r, v, c;

    /// Planeta: distribución uniforme sobre la esfera
    for (n = 0; n < CONFIG.particlesSphere; n++, i++) {
      u = Math.random() * 2 - 1;                 /// altura (-1 polo sur, 1 polo norte)
      theta = Math.random() * Math.PI * 2;
      ring = Math.sqrt(1 - u * u);
      r = CONFIG.sphereRadius * (0.98 + Math.random() * 0.04);
      px[i] = r * ring * Math.cos(theta);
      py[i] = r * u;
      pz[i] = r * ring * Math.sin(theta);
      /// Polo norte lila, ecuador rosa, polo sur durazno
      c = u > 0 ? mix(PALETTE.rosa, PALETTE.lila, u) : mix(PALETTE.rosa, PALETTE.durazno, -u);
      psize[i] = 1.1;
      pcolor[i] = rgba(c, 0.45 + Math.random() * 0.4);
    }

    /// Anillo: disco plano, denso cerca del planeta y disipándose hacia afuera
    for (n = 0; n < CONFIG.particlesRing; n++, i++) {
      v = Math.pow(Math.random(), CONFIG.ringFalloff);   /// 0 = borde interno, 1 = borde externo
      r = CONFIG.ringInner + v * (CONFIG.ringOuter - CONFIG.ringInner);
      theta = Math.random() * Math.PI * 2;
      px[i] = r * Math.cos(theta);
      pz[i] = r * Math.sin(theta);
      py[i] = (Math.random() - 0.5) * CONFIG.ringThickness * (1 + v * 3);
      c = mix(PALETTE.durazno, PALETTE.rosa, Math.min(1, v * 2));
      c = mix(c, PALETTE.lila, Math.max(0, v - 0.4));
      if (Math.random() < 0.03) c = PALETTE.estrella;
      psize[i] = Math.random() < 0.07 ? 1.7 : 1;
      pcolor[i] = rgba(c, (1 - v * 0.8) * (0.3 + Math.random() * 0.5));
    }

    /// Estrellas lejanas en una cáscara esférica grande
    for (n = 0; n < CONFIG.particlesStars; n++, i++) {
      u = Math.random() * 2 - 1;
      theta = Math.random() * Math.PI * 2;
      ring = Math.sqrt(1 - u * u);
      r = 10 + Math.random() * 8;
      px[i] = r * ring * Math.cos(theta);
      py[i] = r * u;
      pz[i] = r * ring * Math.sin(theta);
      psize[i] = Math.random() < 0.15 ? 1.6 : 1;
      pcolor[i] = rgba(PALETTE.estrella, 0.2 + Math.random() * 0.55);
    }
  }

  /// Ajusta el canvas a la ventana (nítido en pantallas retina)
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /// Dibuja un cuadro para el instante t (ms)
  function draw(t) {
    var wide = width >= CONFIG.wideBreakpoint;
    var centerX = width * (wide ? CONFIG.centerXWide : CONFIG.centerXNarrow);
    var centerY = height * (wide ? CONFIG.centerYWide : CONFIG.centerYNarrow);
    var scale = Math.min(width, height) * CONFIG.scale;
    var camDist = CONFIG.cameraDistance;
    var persp = scale * camDist;   /// así el planeta mide ~scale px cuando depth = camDist

    /// Cámara: gira en Y y la inclinación oscila (a veces de canto, a veces desde arriba)
    var yaw = t * CONFIG.rotationSpeed;
    var pitch = CONFIG.tiltBase + Math.sin(t * CONFIG.tiltSpeed) * CONFIG.tiltAmplitude;
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var cp = Math.cos(pitch), sp = Math.sin(pitch);

    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    /// Halo radial suave detrás del planeta
    var haloR = scale * CONFIG.haloRadius;
    var halo = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, haloR);
    halo.addColorStop(0, rgba(PALETTE.rosa, CONFIG.haloAlpha));
    halo.addColorStop(0.4, rgba(PALETTE.lila, CONFIG.haloAlpha * 0.45));
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(centerX - haloR, centerY - haloR, haloR * 2, haloR * 2);

    /// Partículas con proyección en perspectiva
    for (var i = 0; i < total; i++) {
      /// Rotación en Y (giro) y luego en X (inclinación)
      var x1 = px[i] * cy - pz[i] * sy;
      var z1 = px[i] * sy + pz[i] * cy;
      var y2 = py[i] * cp - z1 * sp;
      var z2 = py[i] * sp + z1 * cp;

      var depth = z2 + camDist;
      if (depth < 0.15) continue;   /// detrás de la cámara

      var f = persp / depth;
      var sx = centerX + x1 * f;
      var sy2 = centerY - y2 * f;
      if (sx < -3 || sx > width + 3 || sy2 < -3 || sy2 > height + 3) continue;

      /// Lo cercano se ve un poco más grande
      var size = psize[i] * Math.min(2.4, Math.max(0.6, camDist / depth));
      ctx.fillStyle = pcolor[i];
      ctx.fillRect(sx, sy2, size, size);
    }

    ctx.globalCompositeOperation = "source-over";
  }

  function loop(t) {
    draw(t);
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /// Instante fijo para el cuadro estático (buena vista del anillo)
  var STATIC_T = 9000;

  build();
  resize();

  if (reduceMotion) {
    draw(STATIC_T);
  } else {
    start();
    /// Pausa cuando la pestaña no está visible (ahorra CPU y batería)
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });
  }

  window.addEventListener("resize", function () {
    resize();
    if (reduceMotion) draw(STATIC_T);
  });
})();
