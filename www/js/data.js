// Datos del juego: piezas, materiales, armadillos, mundos y clanes.
var RS = typeof RS !== 'undefined' ? RS : {};
(function (RS) {
  RS.SHAPES = [
    { id: 'cubo', name: 'Cubo', w: 1, h: 1, kind: 'box' },
    { id: 'bloque', name: 'Bloque', w: 2, h: 1, kind: 'box', slice: true },
    { id: 'tablon', name: 'Tablón', w: 4, h: 0.5, kind: 'box', slice: true },
    { id: 'viga', name: 'Viga', w: 6, h: 0.5, kind: 'box', slice: true },
    { id: 'tri', name: 'Triángulo', noTop: true, w: 1, h: 1, kind: 'poly', pts: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5]] },
    { id: 'tejado', name: 'Tejado', noTop: true, w: 2, h: 1, kind: 'poly', pts: [[-1, -0.5], [1, -0.5], [0, 0.5]] },
    { id: 'arco', name: 'Arco', w: 2, h: 1, kind: 'arch' },
    { id: 'rueda', name: 'Rueda', noTop: true, w: 1, h: 1, kind: 'circle', r: 0.5 },
    // --- refuerzos (material fijo, sprite propio de la hoja traps) ---
    { id: 'escuadra', name: 'Escuadra', w: 1, h: 1, kind: 'L', cat: 'ref', mat: 3, sprite: ['traps', 17], weld: true, cost: 2, desc: 'Ángulo de hierro: se suelda a lo que toca y une esquinas.' },
    { id: 'puntal', name: 'Puntal de madera', w: 2, h: 2, kind: 'brace', cat: 'ref', mat: 0, sprite: ['traps', 18], weld: true, cost: 2, desc: 'Diagonal que apuntala paredes y pisos. Gira para la otra diagonal.' },
    { id: 'puntalh', name: 'Puntal de hierro', w: 2, h: 2, kind: 'brace', cat: 'ref', mat: 3, sprite: ['traps', 19], weld: true, cost: 4, desc: 'Diagonal de hierro, mucho más resistente.' },
    { id: 'contrafuerte', name: 'Contrafuerte', noTop: true, w: 2, h: 2, kind: 'poly', pts: [[-1, -1], [1, -1], [1, 1]], cat: 'ref', mat: 1, sprite: ['traps', 21], cost: 4, desc: 'Rampa de piedra que sujeta un muro por fuera y desvía bolas.' },
    { id: 'cimiento', name: 'Cimiento', w: 2, h: 1, kind: 'box', cat: 'ref', mat: 5, sprite: ['traps', 15], static: true, weld: true, ground: true, cost: 5, desc: 'Anclado al suelo: no se mueve nunca. Solo en el suelo.' },
    { id: 'estaca', name: 'Estaca', w: 0.5, h: 1, kind: 'box', cat: 'ref', mat: 3, sprite: ['traps', 23], static: true, weld: true, ground: true, cost: 2, desc: 'Clava la pieza que tenga encima al suelo. Solo en el suelo.' },
    { id: 'contrapeso', name: 'Contrapeso', w: 1, h: 1, kind: 'box', cat: 'ref', mat: 3, sprite: ['traps', 22], dens: 3.5, cost: 3, desc: 'Muy pesado: equilibra voladizos y aplasta lo que cae.' },
    { id: 'placa', name: 'Placa de hierro', w: 1, h: 0.5, kind: 'box', cat: 'ref', mat: 3, sprite: ['traps', 16], weld: true, cost: 2, desc: 'Placa remachada que se suelda: une dos piezas por encima.' },
    // --- trampas de defensa ---
    { id: 'muelle', name: 'Muelle', w: 1, h: 1, kind: 'box', cat: 'trap', trap: 'spring', mat: 3, sprite: ['traps', 0], anim: [0, 1, 2], cost: 5, desc: 'Devuelve al armadillo por donde vino.' },
    { id: 'ventilador', name: 'Ventilador', w: 1, h: 1, kind: 'box', cat: 'trap', trap: 'fan', mat: 3, sprite: ['traps', 3], anim: [3, 4, 5], cost: 6, desc: 'Sopla hacia el cañón y frena a los armadillos que se acercan.' },
    { id: 'torreta', name: 'Torreta', w: 1, h: 1, kind: 'box', cat: 'trap', trap: 'turret', mat: 3, sprite: ['traps', 9], anim: [9, 10, 11], cost: 8, desc: 'Dispara a los armadillos en vuelo (3 disparos).' },
    { id: 'escudo', name: 'Escudo burbuja', w: 1, h: 1, kind: 'box', cat: 'trap', trap: 'shield', mat: 4, sprite: ['traps', 12], cost: 7, desc: 'Burbuja que frena en seco al primer armadillo que entra.' },
    { id: 'gemafalsa', name: 'Gema trampa', w: 1, h: 1, kind: 'circle', r: 0.42, cat: 'trap', trap: 'decoy', mat: 4, sprite: ['traps', 14], cost: 5, desc: 'Parece una gema… y explota lanzando lejos al armadillo.' },
    // --- explosivos (solo en la campaña, ayudan al atacante) ---
    { id: 'barril', name: 'Barril explosivo', w: 1, h: 1, kind: 'box', cat: 'boom', mat: 0, sprite: ['items', 0], explosive: 1, cost: 2 },
    { id: 'tnt', name: 'Caja de TNT', w: 1, h: 1, kind: 'box', cat: 'boom', mat: 0, sprite: ['items', 1], explosive: 1.5, cost: 3 },
  ];
  RS.MAX_TRAPS = 5;
  RS.SHAPE_IDX = {}; RS.SHAPES.forEach(function (s, i) { RS.SHAPE_IDX[s.id] = i; });

  // hp: vida · dens: densidad · cost: puntos de construcción · luz/voladizo: reglas del constructor
  RS.MATS = [
    { id: 'madera', name: 'Madera', dens: 0.6, hp: 55, fr: 0.6, rest: 0.1, cost: 1, luz: 4, vol: 1, sfx: 'wood', debris: 12, lvl: 1 },
    { id: 'piedra', name: 'Piedra', dens: 1.7, hp: 130, fr: 0.7, rest: 0.05, cost: 2, luz: 2, vol: 0, sfx: 'stone', debris: 13, lvl: 1 },
    { id: 'hielo', name: 'Hielo', dens: 0.9, hp: 45, fr: 0.08, rest: 0.1, cost: 2, luz: 3, vol: 1, sfx: 'ice', debris: 14, fragile: 1.6, lvl: 2 },
    { id: 'hierro', name: 'Hierro', dens: 2.5, hp: 230, fr: 0.5, rest: 0.05, cost: 3, luz: 6, vol: 3, sfx: 'metal', debris: 15, metal: true, lvl: 3 },
    { id: 'cristal', name: 'Cristal reforzado', dens: 0.8, hp: 95, fr: 0.3, rest: 0.15, cost: 4, luz: 4, vol: 2, sfx: 'glass', debris: 16, lvl: 4 },
    { id: 'obsidiana', name: 'Obsidiana', dens: 3.0, hp: 320, fr: 0.6, rest: 0.03, cost: 5, luz: 2, vol: 0, sfx: 'stone', debris: 17, lvl: 5 },
  ];

  // Armadillos: hoja de animación = floor(i/3), fila = i%3
  RS.ARMS = [
    { id: 'bolo', name: 'Bolo', rare: 0, world: 1, abil: 'slam', desc: 'Pesado y rodador. Al tocar: cae en picado y golpea más fuerte.' },
    { id: 'triple', name: 'Triple', rare: 0, world: 1, abil: 'split', desc: 'Al tocar: se divide en tres bolas.' },
    { id: 'taladro', name: 'Taladro', rare: 1, world: 2, abil: 'drill', desc: 'Al tocar: perfora madera, piedra, hielo y cristal durante un momento.' },
    { id: 'petardo', name: 'Petardo', rare: 0, world: 1, abil: 'boom', desc: 'Al tocar: explota y empuja todo lo que tiene cerca.' },
    { id: 'rebote', name: 'Rebote', rare: 1, world: 2, abil: 'bounce', desc: 'Al tocar: se vuelve de goma y rebota por la estructura.' },
    { id: 'iman', name: 'Imán', rare: 2, world: 4, abil: 'magnet', desc: 'Al tocar: atrae los bloques de hierro y los derrumba.' },
    { id: 'gigante', name: 'Gigante', rare: 1, world: 3, abil: 'grow', desc: 'Al tocar: crece al triple de tamaño en el aire.' },
    { id: 'bumeran', name: 'Bumerán', rare: 2, world: 5, abil: 'boomerang', desc: 'Al tocar: da la vuelta y golpea por detrás.' },
    { id: 'hielo', name: 'Hielo', rare: 1, world: 3, abil: 'freeze', desc: 'Al tocar: congela los bloques cercanos y los vuelve frágiles.' },
    { id: 'titan', name: 'Titán Acorazado', rare: 3, world: 6, abil: 'meteor', desc: 'Legendario. Al tocar: se convierte en un meteorito en llamas.' },
    { id: 'rayo', name: 'Armadillo Rayo', rare: 3, world: 6, abil: 'dash', desc: 'Legendario. Al tocar: sale disparado como un relámpago.' },
    { id: 'fantasma', name: 'Fantasma', rare: 3, world: 6, abil: 'ghost', desc: 'Legendario. Al tocar: atraviesa paredes durante un instante.' },
  ];
  RS.RARE = ['Común', 'Raro', 'Épico', 'Legendario'];

  RS.WORLDS = [
    { id: 1, name: 'Bosque del Saqueo', bg: 'w1', music: 'RSM03', mats: [0, 0, 0, 1], gemFrom: 0 },
    { id: 2, name: 'Dunas Escarlata', bg: 'w2', music: 'RSM04', mats: [0, 1, 1, 0], gemFrom: 1 },
    { id: 3, name: 'Cumbres Heladas', bg: 'w3', music: 'RSM05', mats: [2, 2, 1, 0, 2], gemFrom: 2 },
    { id: 4, name: 'Volcán Ceniza', bg: 'w4', music: 'RSM06', mats: [3, 1, 5, 3, 0], gemFrom: 3 },
    { id: 5, name: 'Puerto Bandido', bg: 'w5', music: 'RSM07', mats: [0, 0, 3, 1, 4], gemFrom: 4 },
    { id: 6, name: 'Rapiñópolis', bg: 'w6', music: 'RSM08', mats: [4, 3, 5, 1, 4, 0], gemFrom: 5 },
  ];
  RS.LEVELS_PER_WORLD = 20;

  RS.CLANS = {
    japon: { id: 'japon', name: 'Clan del Sol Naciente', short: 'Sol Naciente', desc: 'Castillos japoneses de madera lacada, piedra y oro.', music: 'RSM11', sign: 16, signBox: [0.5, 0.6, 0.72, 0.42, '#fff4d6'], color: '#c0392b' },
    oeste: { id: 'oeste', name: 'Clan de la Frontera', short: 'La Frontera', desc: 'Fuertes del Lejano Oeste: troncos, arenisca y chapa.', music: 'RSM12', sign: 18, signBox: [0.5, 0.7, 0.72, 0.4, '#fff4d6'], color: '#b9772f' },
    azteca: { id: 'azteca', name: 'Clan del Sol de Jade', short: 'Sol de Jade', desc: 'Templos aztecas de piedra tallada, jade y oro.', music: 'RSM13', sign: 18, signBox: [0.5, 0.55, 0.62, 0.45, '#4a2a10'], color: '#1f9e7a' },
  };

  RS.PHYS = { gravity: -10, ballR: 0.45, ballDens: 3.2, vMax: 23, ground: 0 };

  RS.RIVAL_NAMES = ['Fuerte Bigotes', 'Ciudadela Rodante', 'Bastión del Caparazón', 'Torre Pólvora', 'Castillo Garra', 'Muralla Trueno', 'Refugio Coraza', 'Fortín Bellota', 'Alcázar Escama', 'Bastión Cañonazo', 'Torreón Jade', 'Fuerte Antifaz'];
})(RS);
if (typeof module !== 'undefined') module.exports = RS;
