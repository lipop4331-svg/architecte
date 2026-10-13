// Les niveaux de « L'Architecte ». Chaque niveau a une solution de référence ; le plan défectueux
// que reçoit le joueur est dérivé de cette solution par des « mutations » (voir tests.js : tout est vérifié).
// Ouvertures : lettre du côté (N, S, E, O->W), position le long du côté, puis w = fenêtre, d = porte.
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'))
  else root.ArchiLevels = factory(root.Archi)
})(typeof self !== 'undefined' ? self : this, function (A) {
  const R = (id, type, x, y, w, h, ops = '', f = 0) => A.makeRoom(id, type, x, y, w, h, ops ? ops.split(' ') : [], f)
  const I = (id, t, x, y, r = 0, f = 0) => A.makeItem(id, t, x, y, r, f)
  const imv = (id, dx, dy) => ({ m: 'imove', id, dx, dy })
  const idl = (id) => ({ m: 'idel', id })
  const irt = (id) => ({ m: 'irot', id })
  const ifl = (id, f) => ({ m: 'ifloor', id, f })
  const ity = (id, t) => ({ m: 'itype', id, t })
  const fl = (id, f) => ({ m: 'floor', id, f })
  const del = (id) => ({ m: 'del', id })
  const mv = (id, dx, dy) => ({ m: 'move', id, dx, dy })
  const ty = (id, type) => ({ m: 'type', id, type })
  const sz = (id, w, h) => ({ m: 'size', id, w, h })
  const rm = (id, op) => ({ m: 'rmop', id, op })
  const ad = (id, op) => ({ m: 'addop', id, op })

  const LEVELS = [
    {
      id: 1, title: 'Le studio de Léa', w: 10, h: 8, road: 'N', budget: 80, par: 4,
      client: { name: 'Léa', age: 26, job: 'Infirmière', hair: '#6b3b25', skin: '#f2c9a5', quote: 'Je veux un petit nid simple et lumineux, avec une entrée sur la rue.' },
      story: "Léa vient d'acheter un petit terrain. Elle vit seule, rentre tard du travail et veut une maison facile à vivre. Un plan a été dessiné à la hâte : il y a des erreurs.",
      obstacles: [],
      solution: [
        R('salon', 'salon', 1, 1, 5, 4, 'N2d W0w W2w E1d'),
        R('cuis', 'cuisine', 6, 1, 3, 4, 'N1w E1w'),
        R('ch', 'chambre', 1, 5, 4, 3, 'N1d W1w S2w'),
        R('sdb', 'sdb', 5, 5, 2, 3, 'W1d S0w'),
      ],
      muts: [rm('salon', 'N2d'), rm('ch', 'W1w'), rm('ch', 'S2w'), mv('sdb', 3, 0)],
      criteria: [
        { id: 'c1', kind: 'count', type: 'chambre', min: 1, text: 'Une chambre', hint: 'Il faut au moins une pièce de type Chambre.' },
        { id: 'c2', kind: 'count', type: 'cuisine', min: 1, text: 'Une cuisine', hint: 'Il manque une cuisine.' },
        { id: 'c3', kind: 'count', type: 'sdb', min: 1, text: 'Une salle de bain', hint: 'Il manque une salle de bain.' },
        { id: 'c4', kind: 'area', type: 'salon', min: 18, text: 'Un salon d’au moins 18 m²', hint: 'Agrandis le salon avec les boutons de taille.' },
        { id: 'c5', kind: 'window', type: 'salon', min: 1, text: 'Le salon a une fenêtre', hint: 'Clique sur un mur extérieur du salon pour poser une fenêtre.' },
        { id: 'c6', kind: 'window', type: 'chambre', min: 1, text: 'La chambre a une fenêtre', hint: 'Une chambre sans fenêtre, ce n’est pas possible : clique sur son mur extérieur.' },
        { id: 'c7', kind: 'window', type: 'cuisine', min: 1, text: 'La cuisine a une fenêtre', hint: 'Pose une fenêtre sur un mur extérieur de la cuisine.' },
        { id: 'c8', kind: 'entrance', n: 1, side: 'road', text: 'Une seule entrée, côté route (nord)', hint: 'Clique deux fois sur un mur extérieur côté route pour poser une porte d’entrée.' },
        { id: 'c9', kind: 'reachable', text: 'Toutes les pièces sont accessibles depuis l’entrée', hint: 'Relie chaque pièce à une autre par une porte (clique sur le mur qu’elles partagent).' },
        { id: 'c10', kind: 'budget', max: 80, text: 'Budget : 80 k€ maximum', hint: 'Chaque fenêtre et chaque m² coûtent de l’argent.' },
        { id: 'b1', bonus: true, kind: 'link', a: 'salon', b: 'cuisine', text: 'Souhait : une porte entre le salon et la cuisine', hint: 'Clique sur le mur commun du salon et de la cuisine.' },
        { id: 'b2', bonus: true, kind: 'adjacent', a: 'sdb', b: 'chambre', text: 'Souhait : la salle de bain à côté de la chambre', hint: 'Colle la salle de bain contre la chambre.' },
      ],
    },
    {
      id: 2, title: 'La famille Martin', w: 14, h: 10, road: 'S', budget: 130, par: 5,
      client: { name: 'Camille et Hugo Martin', age: 38, job: 'Famille de 4', hair: '#2f2a28', skin: '#e9bd98', quote: 'Les chambres au calme, loin de la route, et un grand salon pour les repas du dimanche.' },
      story: "Les Martin ont deux enfants qui font beaucoup de bruit. Ils veulent que les chambres soient loin de la rue et qu'on ne traverse jamais une chambre pour aller ailleurs.",
      obstacles: [],
      solution: [
        R('c1', 'chambre', 1, 1, 3, 4, 'N1w W1w S1d'),
        R('c2', 'chambre', 4, 1, 3, 4, 'N1w S1d'),
        R('c3', 'chambre', 7, 1, 3, 4, 'N1w S1d'),
        R('sdb', 'sdb', 10, 1, 2, 4, 'N0w S0d'),
        R('salon', 'salon', 1, 5, 6, 4, 'W1w W2w S0w S4w S2d E1d'),
        R('cuis', 'cuisine', 7, 5, 4, 4, 'S1w E1w'),
      ],
      muts: [ty('cuis', 'chambre'), mv('sdb', 0, 4), rm('salon', 'S2d'), ad('c1', 'N1d')],
      criteria: [
        { id: 'c1', kind: 'count', type: 'chambre', min: 3, text: 'Trois chambres', hint: 'Il faut 3 pièces de type Chambre.' },
        { id: 'c2', kind: 'count', type: 'cuisine', min: 1, text: 'Une cuisine', hint: 'Change le type d’une pièce en Cuisine.' },
        { id: 'c3', kind: 'count', type: 'sdb', min: 1, text: 'Une salle de bain', hint: 'La salle de bain a été déplacée sur un autre bloc.' },
        { id: 'c4', kind: 'area', type: 'salon', min: 22, text: 'Un salon d’au moins 22 m²', hint: 'Le salon est trop petit.' },
        { id: 'c5', kind: 'link', a: 'salon', b: 'cuisine', text: 'Une porte entre le salon et la cuisine', hint: 'Clique sur le mur qu’ils partagent.' },
        { id: 'c6', kind: 'adjacent', a: 'sdb', b: 'chambre', text: 'La salle de bain touche une chambre', hint: 'Colle la salle de bain à une chambre.' },
        { id: 'c7', kind: 'awayFromRoad', type: 'chambre', d: 4, text: 'Chambres à 4 m au moins de la route (sud)', hint: 'Les chambres doivent être dans la moitié nord du terrain.' },
        { id: 'c8', kind: 'window', type: 'chambre', min: 1, text: 'Chaque chambre a une fenêtre', hint: 'Vérifie les murs extérieurs des chambres.' },
        { id: 'c9', kind: 'entrance', n: 1, side: 'road', text: 'Une seule entrée, côté route (sud)', hint: 'L’entrée ne doit pas être dans une chambre, ni du mauvais côté.' },
        { id: 'c10', kind: 'reachable', text: 'Toutes les pièces sont accessibles', hint: 'Relie les pièces par des portes.' },
        { id: 'c11', kind: 'noThrough', text: 'Jamais besoin de traverser une chambre pour aller ailleurs', hint: 'Une chambre ne doit pas être le seul passage vers une autre pièce.' },
        { id: 'c12', kind: 'budget', max: 130, text: 'Budget : 130 k€ maximum', hint: '' },
        { id: 'b1', bonus: true, kind: 'window', type: 'salon', side: 'S', min: 2, any: true, text: 'Souhait : deux fenêtres au sud dans le salon (soleil)', hint: 'Le sud est le bas du plan.' },
        { id: 'b2', bonus: true, kind: 'area', type: 'cuisine', min: 14, text: 'Souhait : une cuisine de 14 m² ou plus', hint: '' },
      ],
    },
    {
      id: 3, title: 'Le télétravailleur', w: 14, h: 10, road: 'W', budget: 125, par: 5,
      client: { name: 'Samir', age: 33, job: 'Développeur', hair: '#1c1c1c', skin: '#c98f64', quote: 'Il me faut un bureau avec une lumière douce toute la journée : la lumière du nord.' },
      story: "Samir travaille de chez lui. Le terrain a un arbre protégé et une mare qu'on ne peut pas toucher. Il tient à son bureau et à un salon plein sud.",
      obstacles: [{ x: 13, y: 1, w: 1, h: 1, kind: 'tree' }, { x: 11, y: 7, w: 3, h: 3, kind: 'pond' }],
      solution: [
        R('bur', 'bureau', 2, 1, 3, 3, 'N1w S1d'),
        R('c1', 'chambre', 5, 1, 4, 3, 'N1w N2w S1d'),
        R('c2', 'chambre', 9, 1, 4, 3, 'N1w E1w S0d'),
        R('salon', 'salon', 2, 4, 5, 5, 'W1d W3w S1w S3w E2d'),
        R('cuis', 'cuisine', 7, 4, 3, 5, 'S1w E3w'),
        R('sdb', 'sdb', 10, 4, 2, 3, 'N0d E0w'),
      ],
      muts: [ty('bur', 'garage'), rm('bur', 'N1w'), mv('cuis', 2, 0), rm('salon', 'W1d'), ad('c2', 'E1d')],
      criteria: [
        { id: 'c1', kind: 'count', type: 'chambre', min: 2, text: 'Deux chambres', hint: '' },
        { id: 'c2', kind: 'count', type: 'bureau', min: 1, text: 'Un bureau', hint: 'Une pièce a changé de type.' },
        { id: 'c3', kind: 'window', type: 'bureau', side: 'N', min: 1, text: 'Le bureau a une fenêtre au nord (haut du plan)', hint: 'La lumière du nord est stable : fenêtre côté haut.' },
        { id: 'c4', kind: 'window', type: 'salon', side: 'S', min: 1, text: 'Le salon a une fenêtre au sud (soleil)', hint: '' },
        { id: 'c5', kind: 'area', type: 'salon', min: 22, text: 'Un salon d’au moins 22 m²', hint: '' },
        { id: 'c6', kind: 'link', a: 'salon', b: 'cuisine', text: 'Une porte entre le salon et la cuisine', hint: '' },
        { id: 'c7', kind: 'adjacent', a: 'sdb', b: 'chambre', text: 'La salle de bain touche une chambre', hint: '' },
        { id: 'c8', kind: 'window', type: 'chambre', min: 1, text: 'Chaque chambre a une fenêtre', hint: '' },
        { id: 'c9', kind: 'entrance', n: 1, side: 'road', text: 'Une seule entrée, côté route (ouest)', hint: '' },
        { id: 'c10', kind: 'reachable', text: 'Toutes les pièces sont accessibles', hint: '' },
        { id: 'c11', kind: 'budget', max: 125, text: 'Budget : 125 k€ maximum', hint: '' },
        { id: 'b1', bonus: true, kind: 'link', a: 'sdb', b: 'chambre', text: 'Souhait : la salle de bain ouverte sur une chambre (suite parentale)', hint: '' },
        { id: 'b2', bonus: true, kind: 'awayFromRoad', type: 'bureau', d: 2, text: 'Souhait : le bureau à 2 m au moins de la route', hint: '' },
      ],
    },
    {
      id: 4, title: 'Papi Georges', w: 14, h: 10, road: 'S', budget: 110, par: 5,
      client: { name: 'Georges', age: 74, job: 'Retraité', hair: '#d8d8d8', skin: '#e8bd9a', quote: 'À mon âge, je veux tout de plain-pied, un couloir bien large et mon garage près de la cuisine.' },
      story: "Georges a du mal à marcher. Il lui faut un couloir assez large, une chambre près de la salle de bain, et son garage relié à la cuisine pour rentrer les courses.",
      obstacles: [],
      solution: [
        R('ch', 'chambre', 1, 1, 4, 3, 'W1w N1w N2w S0d'),
        R('sdb', 'sdb', 5, 1, 2, 3, 'N0w S0d W1d'),
        R('cou', 'couloir', 1, 4, 6, 2, 'E0d'),
        R('salon', 'salon', 7, 1, 5, 5, 'N1w N3w E1w E3w S1w S4w S2d'),
        R('gar', 'garage', 1, 6, 3, 3, 'S1w E1d'),
        R('cuis', 'cuisine', 4, 6, 4, 3, 'N1d N3d S1w S2w'),
      ],
      muts: [ty('gar', 'chambre'), mv('sdb', 0, 3), rm('salon', 'S2d'), ad('ch', 'W2d')],
      criteria: [
        { id: 'c1', kind: 'count', type: 'chambre', min: 1, text: 'Une chambre', hint: '' },
        { id: 'c2', kind: 'count', type: 'garage', min: 1, text: 'Un garage', hint: 'Une pièce a changé de type.' },
        { id: 'c3', kind: 'count', type: 'couloir', min: 1, text: 'Un couloir', hint: '' },
        { id: 'c4', kind: 'area', type: 'couloir', min: 10, text: 'Un couloir large : 10 m² au moins', hint: '' },
        { id: 'c5', kind: 'area', type: 'salon', min: 20, text: 'Un salon d’au moins 20 m²', hint: '' },
        { id: 'c6', kind: 'link', a: 'garage', b: 'cuisine', text: 'Le garage est relié à la cuisine par une porte', hint: '' },
        { id: 'c7', kind: 'adjacent', a: 'sdb', b: 'chambre', text: 'La salle de bain touche la chambre', hint: '' },
        { id: 'c8', kind: 'window', type: 'chambre', min: 1, text: 'La chambre a une fenêtre', hint: '' },
        { id: 'c9', kind: 'entrance', n: 1, side: 'road', text: 'Une seule entrée, côté route (sud)', hint: '' },
        { id: 'c10', kind: 'reachable', text: 'Toutes les pièces sont accessibles', hint: '' },
        { id: 'c11', kind: 'noThrough', text: 'On ne traverse jamais la chambre pour aller ailleurs', hint: '' },
        { id: 'c12', kind: 'budget', max: 110, text: 'Budget : 110 k€ maximum', hint: '' },
        { id: 'b1', bonus: true, kind: 'link', a: 'sdb', b: 'chambre', text: 'Souhait : une porte directe entre la chambre et la salle de bain', hint: '' },
        { id: 'b2', bonus: true, kind: 'window', type: 'salon', side: 'S', min: 2, any: true, text: 'Souhait : deux fenêtres au sud dans le salon', hint: '' },
      ],
    },
    {
      id: 5, title: 'L’atelier de Maya', w: 14, h: 10, road: 'E', budget: 105, par: 5,
      client: { name: 'Maya', age: 41, job: 'Peintre', hair: '#a8442c', skin: '#f0c8a8', quote: 'Mon atelier doit être immense, avec trois grandes fenêtres au nord. Et ma chambre loin du bruit de la route !' },
      story: "Maya peint des toiles gigantesques. Elle a besoin de lumière du nord pour ses couleurs et d'un sommeil tranquille : pas de fenêtre de chambre côté route.",
      obstacles: [],
      solution: [
        R('bur', 'bureau', 1, 1, 6, 4, 'N0w N2w N4w W1w E1d'),
        R('ch', 'chambre', 1, 5, 4, 3, 'W1w S1w E1d'),
        R('sdb', 'sdb', 5, 5, 2, 3, 'N0d S0w'),
        R('salon', 'salon', 7, 1, 4, 4, 'N1w N2w E2d S2d'),
        R('cuis', 'cuisine', 7, 5, 4, 3, 'S1w E1w'),
      ],
      muts: [mv('ch', 9, -4), rm('bur', 'N2w'), sz('bur', 4, 4), ad('ch', 'E1w')],
      criteria: [
        { id: 'c1', kind: 'area', type: 'bureau', min: 22, text: 'Un atelier (bureau) de 22 m² au moins', hint: 'Agrandis l’atelier.' },
        { id: 'c2', kind: 'window', type: 'bureau', side: 'N', min: 3, text: 'Trois fenêtres au nord dans l’atelier', hint: 'La lumière du nord : bord haut du plan.' },
        { id: 'c3', kind: 'count', type: 'chambre', min: 1, text: 'Une chambre', hint: '' },
        { id: 'c4', kind: 'noWindowSide', type: 'chambre', side: 'E', text: 'Aucune fenêtre de chambre côté route (est)', hint: 'Le bruit de la route est à droite.' },
        { id: 'c5', kind: 'awayFromRoad', type: 'chambre', d: 4, text: 'La chambre à 4 m au moins de la route (est)', hint: '' },
        { id: 'c6', kind: 'window', type: 'chambre', min: 1, text: 'La chambre a une fenêtre', hint: '' },
        { id: 'c7', kind: 'count', type: 'cuisine', min: 1, text: 'Une cuisine', hint: '' },
        { id: 'c8', kind: 'count', type: 'sdb', min: 1, text: 'Une salle de bain', hint: '' },
        { id: 'c9', kind: 'area', type: 'salon', min: 14, text: 'Un salon d’au moins 14 m²', hint: '' },
        { id: 'c10', kind: 'entrance', n: 1, side: 'road', text: 'Une seule entrée, côté route (est)', hint: '' },
        { id: 'c11', kind: 'reachable', text: 'Toutes les pièces sont accessibles', hint: '' },
        { id: 'c12', kind: 'budget', max: 105, text: 'Budget : 105 k€ maximum', hint: '' },
        { id: 'b1', bonus: true, kind: 'adjacent', a: 'sdb', b: 'chambre', text: 'Souhait : la salle de bain à côté de la chambre', hint: '' },
        { id: 'b2', bonus: true, kind: 'link', a: 'bureau', b: 'salon', text: 'Souhait : une porte entre l’atelier et le salon', hint: '' },
      ],
    },
    {
      id: 6, title: 'La grande villa', w: 16, h: 12, road: 'S', budget: 175, par: 7,
      client: { name: 'Madame Delorme', age: 52, job: 'Directrice', hair: '#c9b27a', skin: '#efc5a2', quote: 'Je reçois beaucoup. Je veux tout : trois chambres, un bureau, deux salles de bain, un garage et un grand salon.' },
      story: "Le plus gros chantier. Mme Delorme veut une villa complète sur un grand terrain avec un arbre et une mare. Respecte tous ses critères sans exploser le budget.",
      obstacles: [{ x: 14, y: 8, w: 2, h: 2, kind: 'tree' }, { x: 1, y: 9, w: 3, h: 3, kind: 'pond' }],
      solution: [
        R('c1', 'chambre', 1, 1, 4, 3, 'N1w W1w S3d'),
        R('c2', 'chambre', 5, 1, 4, 3, 'N1w S1d'),
        R('c3', 'chambre', 9, 1, 4, 3, 'N1w S1d'),
        R('bur', 'bureau', 13, 1, 3, 3, 'N1w E1w S0d'),
        R('sdb1', 'sdb', 1, 4, 2, 3, 'W1w N0d'),
        R('salon', 'salon', 3, 4, 6, 5, 'W3w S0w S4w S2d E1d W0d'),
        R('cuis', 'cuisine', 9, 4, 5, 4, 'E3w S4w'),
        R('sdb2', 'sdb', 14, 4, 2, 3, 'E0w W1d'),
        R('gar', 'garage', 9, 8, 4, 3, 'S1w E1w N1d'),
      ],
      muts: [mv('gar', 4, 0), ty('sdb2', 'chambre'), rm('salon', 'S2d'), rm('salon', 'S0w'), ad('bur', 'N1d')],
      criteria: [
        { id: 'c1', kind: 'count', type: 'chambre', min: 3, max: 3, text: 'Exactement trois chambres', hint: 'Une salle de bain est devenue une chambre.' },
        { id: 'c2', kind: 'count', type: 'sdb', min: 2, text: 'Deux salles de bain', hint: '' },
        { id: 'c3', kind: 'count', type: 'bureau', min: 1, text: 'Un bureau', hint: '' },
        { id: 'c4', kind: 'count', type: 'garage', min: 1, text: 'Un garage', hint: '' },
        { id: 'c5', kind: 'area', type: 'salon', min: 28, text: 'Un grand salon : 28 m² au moins', hint: '' },
        { id: 'c6', kind: 'area', type: 'cuisine', min: 18, text: 'Une grande cuisine : 18 m² au moins', hint: '' },
        { id: 'c7', kind: 'link', a: 'salon', b: 'cuisine', text: 'Une porte entre le salon et la cuisine', hint: '' },
        { id: 'c8', kind: 'link', a: 'garage', b: 'cuisine', text: 'Le garage est relié à la cuisine', hint: '' },
        { id: 'c9', kind: 'window', type: 'bureau', side: 'N', min: 1, text: 'Le bureau a une fenêtre au nord', hint: '' },
        { id: 'c10', kind: 'window', type: 'salon', side: 'S', min: 2, any: true, text: 'Deux fenêtres au sud dans le salon', hint: '' },
        { id: 'c11', kind: 'window', type: 'chambre', min: 1, text: 'Chaque chambre a une fenêtre', hint: '' },
        { id: 'c12', kind: 'awayFromRoad', type: 'chambre', d: 4, text: 'Chambres à 4 m au moins de la route (sud)', hint: '' },
        { id: 'c13', kind: 'entrance', n: 1, side: 'road', text: 'Une seule entrée, côté route (sud)', hint: '' },
        { id: 'c14', kind: 'reachable', text: 'Toutes les pièces sont accessibles', hint: '' },
        { id: 'c15', kind: 'noThrough', text: 'Jamais besoin de traverser une chambre', hint: '' },
        { id: 'c16', kind: 'budget', max: 175, text: 'Budget : 175 k€ maximum', hint: '' },
        { id: 'b1', bonus: true, kind: 'link', a: 'sdb', b: 'chambre', text: 'Souhait : une salle de bain ouverte sur une chambre', hint: '' },
        { id: 'b2', bonus: true, kind: 'budget', max: 160, text: 'Souhait : rester sous 160 k€', hint: '' },
      ],
    },
    // ---------- Nouveautés : meubles, étage, escalier, jardin ----------
    {
      id: 7, title: 'Aménager les pièces', w: 12, h: 9, road: 'S', floors: 1, budget: 100, par: 5,
      palette: ['lit1', 'lit2', 'armoire', 'canape', 'table', 'evier', 'plaque', 'frigo', 'baignoire', 'lavabo', 'wc'],
      client: { name: 'Inès et Tom', age: 29, job: 'Jeune couple', hair: '#8a4b2a', skin: '#f0c6a2', quote: 'On veut une maison prête à vivre : un grand lit, une cuisine équipée et une vraie baignoire.' },
      story: 'Le gros œuvre est terminé, mais personne n’a mis de meubles. Choisis-les dans la liste « Ajouter un meuble » et glisse-les dans les bonnes pièces. Un meuble doit tenir entièrement dans une pièce, sans toucher un autre.',
      obstacles: [],
      solution: {
        rooms: [
          R('ch', 'chambre', 1, 1, 4, 3, 'N1w W1w S1d'),
          R('sdb', 'sdb', 5, 1, 3, 3, 'N1w E1w S0d W1d'),
          R('salon', 'salon', 1, 4, 5, 4, 'W2w S3w S1d E1d'),
          R('cuis', 'cuisine', 6, 4, 4, 4, 'S1w E1w'),
        ],
        items: [
          I('lit', 'lit2', 1, 1), I('arm', 'armoire', 3, 1), I('can', 'canape', 1, 7), I('tab', 'table', 3, 4),
          I('evi', 'evier', 6, 4), I('pla', 'plaque', 8, 4), I('fri', 'frigo', 9, 4),
          I('bai', 'baignoire', 5, 1), I('lav', 'lavabo', 7, 1), I('wc', 'wc', 7, 3),
        ],
      },
      muts: [idl('lit'), idl('pla'), imv('can', 3, 0), ity('wc', 'lavabo'), imv('bai', -4, 0)],
      criteria: [
        { id: 'c1', kind: 'count', type: 'chambre', min: 1, text: 'Une chambre', hint: '' },
        { id: 'c2', kind: 'count', type: 'cuisine', min: 1, text: 'Une cuisine', hint: '' },
        { id: 'c3', kind: 'count', type: 'sdb', min: 1, text: 'Une salle de bain', hint: '' },
        { id: 'c4', kind: 'furn', item: 'lit2', room: 'chambre', text: 'Un lit double dans la chambre', hint: 'Choisis « Lit double » dans la liste et ajoute-le, puis glisse-le dans la chambre.' },
        { id: 'c5', kind: 'furn', item: 'evier', room: 'cuisine', text: 'Un évier dans la cuisine', hint: '' },
        { id: 'c6', kind: 'furn', item: 'plaque', room: 'cuisine', text: 'Des plaques de cuisson dans la cuisine', hint: '' },
        { id: 'c7', kind: 'furn', item: 'frigo', room: 'cuisine', text: 'Un frigo dans la cuisine', hint: '' },
        { id: 'c8', kind: 'furn', item: 'baignoire', room: 'sdb', text: 'Une baignoire dans la salle de bain', hint: 'La baignoire est dans la mauvaise pièce.' },
        { id: 'c9', kind: 'furn', item: 'lavabo', room: 'sdb', text: 'Un lavabo dans la salle de bain', hint: '' },
        { id: 'c10', kind: 'furn', item: 'wc', room: 'sdb', text: 'Des WC dans la salle de bain', hint: 'Un meuble a changé de nature : regarde ce qui est posé dans la salle de bain.' },
        { id: 'c11', kind: 'furn', item: 'canape', room: 'salon', text: 'Un canapé dans le salon', hint: 'Il dépasse du salon : décale-le pour qu’il rentre dedans.' },
        { id: 'c12', kind: 'entrance', n: 1, side: 'road', text: 'Une seule entrée, côté route (sud)', hint: '' },
        { id: 'c13', kind: 'reachable', text: 'Toutes les pièces sont accessibles', hint: '' },
        { id: 'c14', kind: 'window', type: 'chambre', min: 1, text: 'La chambre a une fenêtre', hint: '' },
        { id: 'c15', kind: 'budget', max: 100, text: 'Budget : 100 k€ maximum', hint: '' },
        { id: 'b1', bonus: true, kind: 'furn', item: 'table', room: 'salon', text: 'Souhait : une table à manger dans le salon', hint: '' },
        { id: 'b2', bonus: true, kind: 'furn', item: 'armoire', room: 'chambre', text: 'Souhait : une armoire dans la chambre', hint: '' },
      ],
    },
    {
      id: 8, title: 'La maison à étage', w: 12, h: 10, road: 'S', floors: 2, budget: 150, par: 6,
      palette: ['escalier'],
      client: { name: 'Léonie et Marc', age: 35, job: 'Parents de deux enfants', hair: '#c4553b', skin: '#f1c9a8', quote: 'Le jour en bas, la nuit en haut ! Et surtout un escalier pour relier les deux.' },
      story: 'Cette maison a deux niveaux. Utilise les onglets « Rez-de-chaussée » et « Étage » au-dessus du plan. Les pièces de l’étage doivent reposer sur celles d’en bas, et l’escalier doit tomber dans une pièce à chaque niveau.',
      obstacles: [],
      solution: {
        rooms: [
          R('bur', 'bureau', 1, 1, 4, 2, 'N1w N2w W0w S1d'),
          R('sdbA', 'sdb', 5, 1, 3, 2, 'N1w S0d'),
          R('salon', 'salon', 1, 3, 6, 4, 'W1w W3w S0w S1w S2d E1d'),
          R('cuis', 'cuisine', 7, 3, 4, 4, 'E1w S1w S3w'),
          R('c1', 'chambre', 1, 3, 4, 3, 'W1w N1w', 1),
          R('c2', 'chambre', 5, 3, 4, 3, 'N1w N2w', 1),
          R('sdbB', 'sdb', 9, 3, 2, 3, 'N0w E0w S0d', 1),
          R('cou', 'couloir', 1, 6, 10, 1, 'N1d N5d W0w', 1),
        ],
        items: [I('esc', 'escalier', 4, 6, 1, 0)],
      },
      muts: [fl('c2', 0), idl('esc'), mv('sdbB', 3, 0), rm('salon', 'S2d')],
      criteria: [
        { id: 'c1', kind: 'count', type: 'chambre', min: 2, f: 1, text: 'Au moins deux chambres à l’étage', hint: 'Une chambre est restée en bas : change-la d’étage avec l’onglet.' },
        { id: 'c2', kind: 'count', type: 'salon', min: 1, f: 0, text: 'Le salon au rez-de-chaussée', hint: '' },
        { id: 'c3', kind: 'count', type: 'cuisine', min: 1, f: 0, text: 'La cuisine au rez-de-chaussée', hint: '' },
        { id: 'c4', kind: 'count', type: 'sdb', min: 2, text: 'Deux salles de bain', hint: '' },
        { id: 'c5', kind: 'count', type: 'bureau', min: 1, text: 'Un bureau', hint: '' },
        { id: 'c6', kind: 'furn', item: 'escalier', text: 'Un escalier relie les deux étages', hint: 'Ajoute un escalier, puis place-le : il doit être dans une pièce en bas et dans une pièce en haut, aux mêmes cases.' },
        { id: 'c7', kind: 'area', type: 'salon', min: 22, text: 'Un salon d’au moins 22 m²', hint: '' },
        { id: 'c8', kind: 'window', type: 'chambre', min: 1, text: 'Chaque chambre a une fenêtre', hint: '' },
        { id: 'c9', kind: 'awayFromRoad', type: 'chambre', d: 3, text: 'Chambres à 3 m au moins de la route (sud)', hint: '' },
        { id: 'c10', kind: 'entrance', n: 1, side: 'road', text: 'Une seule entrée, côté route (sud), au rez-de-chaussée', hint: '' },
        { id: 'c11', kind: 'reachable', text: 'Toutes les pièces, étage compris, sont accessibles', hint: 'Sans escalier, l’étage est coupé du reste.' },
        { id: 'c12', kind: 'noThrough', text: 'Jamais besoin de traverser une chambre', hint: '' },
        { id: 'c13', kind: 'budget', max: 150, text: 'Budget : 150 k€ maximum', hint: '' },
        { id: 'b1', bonus: true, kind: 'window', type: 'salon', side: 'S', min: 2, any: true, text: 'Souhait : deux fenêtres au sud dans le salon', hint: '' },
        { id: 'b2', bonus: true, kind: 'link', a: 'salon', b: 'bureau', text: 'Souhait : une porte entre le salon et le bureau', hint: '' },
      ],
    },
    {
      id: 9, title: 'Terrasse et piscine', w: 16, h: 12, road: 'W', floors: 1, budget: 120, par: 5,
      palette: ['terrasse', 'piscine', 'arbre', 'potager'],
      client: { name: 'Aurélie', age: 45, job: 'Chef d’entreprise', hair: '#3b2a21', skin: '#dba67d', quote: 'Je veux déjeuner sur la terrasse, plonger dans ma piscine et avoir de l’ombre au fond du jardin.' },
      story: 'Le jardin est grand mais il y a une mare à ne pas toucher. Les éléments de jardin (terrasse, piscine, arbres, potager) se posent hors de la maison. Une porte du salon donnant sur la terrasse n’est pas une entrée.',
      obstacles: [{ x: 9, y: 10, w: 3, h: 2, kind: 'pond' }],
      solution: {
        rooms: [
          R('c1', 'chambre', 2, 2, 4, 3, 'N1w W1w S1d'),
          R('c2', 'chambre', 6, 2, 4, 3, 'N1w N2w S1d'),
          R('sdb', 'sdb', 10, 2, 2, 3, 'N0w E0w S0d'),
          R('salon', 'salon', 2, 5, 6, 4, 'W1d W3w S1d S4w E1d'),
          R('cuis', 'cuisine', 8, 5, 4, 4, 'S1w E1w'),
        ],
        items: [I('terr', 'terrasse', 3, 9), I('pool', 'piscine', 12, 5), I('t1', 'arbre', 14, 2), I('t2', 'arbre', 14, 9), I('pot', 'potager', 7, 10)],
      },
      muts: [imv('pool', -4, 0), idl('terr'), imv('t1', -6, 0), rm('salon', 'S1d'), ad('salon', 'W2d')],
      criteria: [
        { id: 'c1', kind: 'count', type: 'chambre', min: 2, text: 'Deux chambres', hint: '' },
        { id: 'c2', kind: 'count', type: 'cuisine', min: 1, text: 'Une cuisine', hint: '' },
        { id: 'c3', kind: 'count', type: 'sdb', min: 1, text: 'Une salle de bain', hint: '' },
        { id: 'c4', kind: 'area', type: 'salon', min: 22, text: 'Un salon d’au moins 22 m²', hint: '' },
        { id: 'c5', kind: 'entrance', n: 1, side: 'road', text: 'Une seule entrée, côté route (ouest)', hint: 'La porte du salon vers la terrasse ne compte pas comme une entrée.' },
        { id: 'c6', kind: 'reachable', text: 'Toutes les pièces sont accessibles', hint: '' },
        { id: 'c7', kind: 'garden', item: 'terrasse', min: 1, text: 'Une terrasse', hint: 'Ajoute une terrasse depuis la liste, hors de la maison.' },
        { id: 'c8', kind: 'patio', room: 'salon', text: 'Le salon s’ouvre sur la terrasse par une porte', hint: 'Pose une porte sur le mur du salon qui touche la terrasse.' },
        { id: 'c9', kind: 'garden', item: 'piscine', min: 1, text: 'Une piscine', hint: 'La piscine chevauche la maison : décale-la.' },
        { id: 'c10', kind: 'gardenAway', item: 'piscine', d: 6, text: 'La piscine à 6 m au moins de la route (ouest)', hint: '' },
        { id: 'c11', kind: 'garden', item: 'arbre', min: 2, text: 'Au moins deux arbres', hint: 'Un arbre est posé sur la maison.' },
        { id: 'c12', kind: 'window', type: 'chambre', min: 1, text: 'Chaque chambre a une fenêtre', hint: '' },
        { id: 'c13', kind: 'window', type: 'salon', min: 1, text: 'Le salon a une fenêtre', hint: '' },
        { id: 'c14', kind: 'budget', max: 120, text: 'Budget : 120 k€ maximum', hint: '' },
        { id: 'b1', bonus: true, kind: 'garden', item: 'arbre', min: 2, zone: 'E', text: 'Souhait : deux arbres au fond du jardin (côté est)', hint: '' },
        { id: 'b2', bonus: true, kind: 'garden', item: 'potager', min: 1, text: 'Souhait : un potager', hint: '' },
      ],
    },
    {
      id: 10, title: 'Le duplex familial', w: 14, h: 11, road: 'W', floors: 2, budget: 155, par: 8,
      palette: ['lit1', 'lit2', 'armoire', 'canape', 'table', 'evier', 'plaque', 'frigo', 'baignoire', 'lavabo', 'wc', 'voiture', 'escalier'],
      client: { name: 'La famille Bernard', age: 40, job: 'Cinq personnes', hair: '#7a4a2e', skin: '#e8b992', quote: 'On veut tout ! Trois chambres à l’étage, un garage avec la voiture, et une vraie cuisine équipée.' },
      story: 'Le grand défi : une maison à étage, entièrement meublée, avec garage. Garde un œil sur le budget : les meubles et l’escalier coûtent cher.',
      obstacles: [],
      solution: {
        rooms: [
          R('salon', 'salon', 2, 5, 6, 4, 'W1d W2w W3w S1w S3w E1d'),
          R('cuis', 'cuisine', 8, 5, 4, 4, 'E1w E2w S3w'),
          R('gar', 'garage', 8, 1, 4, 4, 'N1w E1w S1d'),
          R('sdb0', 'sdb', 5, 3, 3, 2, 'N1w S1d'),
          R('c1', 'chambre', 2, 5, 4, 3, 'W1w N1w S1d', 1),
          R('c2', 'chambre', 6, 5, 4, 3, 'N1w', 1),
          R('c3', 'chambre', 10, 5, 2, 3, 'E1w S0d', 1),
          R('sdb1', 'sdb', 2, 8, 4, 1, 'W0w S0w E0d', 1),
          R('cou', 'couloir', 6, 8, 6, 1, 'N1d S1w', 1),
        ],
        items: [
          I('can', 'canape', 3, 8), I('tab', 'table', 5, 5), I('esc', 'escalier', 8, 8, 1, 0),
          I('evi', 'evier', 8, 5), I('pla', 'plaque', 10, 5), I('fri', 'frigo', 11, 5),
          I('wc0', 'wc', 5, 3), I('lav0', 'lavabo', 6, 3), I('car', 'voiture', 9, 1),
          I('b1', 'lit2', 2, 5, 0, 1), I('arm', 'armoire', 4, 5, 0, 1), I('b2', 'lit2', 6, 5, 0, 1), I('b3', 'lit1', 10, 5, 0, 1),
          I('bai', 'baignoire', 2, 8, 0, 1), I('lav1', 'lavabo', 4, 8, 0, 1), I('wc1', 'wc', 5, 8, 0, 1),
        ],
      },
      muts: [ifl('b2', 0), idl('evi'), imv('esc', 0, -4), irt('can'), fl('c3', 0), rm('salon', 'W1d')],
      criteria: [
        { id: 'c1', kind: 'count', type: 'chambre', min: 3, f: 1, text: 'Trois chambres à l’étage', hint: 'Une chambre est restée au rez-de-chaussée.' },
        { id: 'c2', kind: 'count', type: 'salon', min: 1, f: 0, text: 'Le salon au rez-de-chaussée', hint: '' },
        { id: 'c3', kind: 'count', type: 'sdb', min: 2, text: 'Deux salles de bain', hint: '' },
        { id: 'c4', kind: 'count', type: 'garage', min: 1, text: 'Un garage', hint: '' },
        { id: 'c5', kind: 'furn', item: 'escalier', text: 'Un escalier relie les deux étages', hint: 'L’escalier est mal placé : il doit tomber dans une pièce à chaque étage.' },
        { id: 'c6', kind: 'furn', item: 'lit2', room: 'chambre', min: 2, text: 'Deux lits doubles dans les chambres', hint: 'Un lit a été mis au mauvais étage.' },
        { id: 'c7', kind: 'furn', item: 'lit1', room: 'chambre', min: 1, text: 'Un lit simple dans une chambre', hint: '' },
        { id: 'c8', kind: 'furn', item: 'evier', room: 'cuisine', text: 'Un évier dans la cuisine', hint: '' },
        { id: 'c9', kind: 'furn', item: 'plaque', room: 'cuisine', text: 'Des plaques dans la cuisine', hint: '' },
        { id: 'c10', kind: 'furn', item: 'frigo', room: 'cuisine', text: 'Un frigo dans la cuisine', hint: '' },
        { id: 'c11', kind: 'furn', item: 'baignoire', room: 'sdb', text: 'Une baignoire dans une salle de bain', hint: '' },
        { id: 'c12', kind: 'furn', item: 'canape', room: 'salon', text: 'Un canapé dans le salon', hint: 'Il dépasse : tourne-le ou déplace-le.' },
        { id: 'c13', kind: 'furn', item: 'voiture', room: 'garage', text: 'La voiture dans le garage', hint: '' },
        { id: 'c14', kind: 'link', a: 'garage', b: 'cuisine', text: 'Le garage est relié à la cuisine', hint: '' },
        { id: 'c15', kind: 'entrance', n: 1, side: 'road', text: 'Une seule entrée, côté route (ouest)', hint: '' },
        { id: 'c16', kind: 'reachable', text: 'Toutes les pièces sont accessibles', hint: '' },
        { id: 'c17', kind: 'noThrough', text: 'Jamais besoin de traverser une chambre pour aller ailleurs', hint: '' },
        { id: 'c18', kind: 'window', type: 'chambre', min: 1, text: 'Chaque chambre a une fenêtre', hint: '' },
        { id: 'c19', kind: 'area', type: 'salon', min: 22, text: 'Un salon d’au moins 22 m²', hint: '' },
        { id: 'c20', kind: 'budget', max: 155, text: 'Budget : 155 k€ maximum', hint: '' },
        { id: 'b1', bonus: true, kind: 'budget', max: 145, text: 'Souhait : rester sous 145 k€', hint: '' },
        { id: 'b2', bonus: true, kind: 'furn', item: 'armoire', room: 'chambre', text: 'Souhait : une armoire dans une chambre', hint: '' },
      ],
    },

    // ---------- Les défis : terrains difficiles, normes, voisins, deux clients, changement d'avis ----------
    {
      id: 11, title: 'Le terrain accidenté', w: 14, h: 11, road: 'S', floors: 1, budget: 106, par: 6,
      client: { name: 'Nora', age: 36, job: 'Géologue', quote: 'Mon terrain est un casse-tête : un rocher, une zone protégée. Je veux une maison compacte et pas chère, mais bien orientée.' },
      story: 'Une partie du terrain est interdite (zone hachurée au nord-est) et un rocher bloque le coin sud-ouest. Le budget est très serré et la maison doit rester petite : choisis bien chaque mètre carré.',
      obstacles: [{ x: 8, y: 0, w: 6, h: 4, kind: 'zone' }, { x: 0, y: 8, w: 2, h: 3, kind: 'rock' }],
      solution: {
        rooms: [
          R('c1', 'chambre', 1, 1, 4, 3, 'N0w W1w S1d'),
          R('c2', 'chambre', 5, 1, 3, 3, 'N1w E1w S1d'),
          R('salon', 'salon', 1, 4, 6, 4, 'S0w S5w S4d E1d'),
          R('cuis', 'cuisine', 7, 4, 4, 4, 'N2w E3w S1w'),
          R('sdb', 'sdb', 11, 4, 2, 3, 'N0w E0w W1d'),
          R('bur', 'bureau', 2, 8, 3, 2, 'S1w W0w N1d'),
        ],
        items: [],
      },
      muts: [mv('c2', 3, 0), ty('bur', 'garage'), sz('salon', 4, 4), rm('salon', 'S4d')],
      criteria: [
        { id: 'c1', kind: 'count', type: 'chambre', min: 2, text: 'Deux chambres', hint: '' },
        { id: 'c2', kind: 'count', type: 'bureau', min: 1, text: 'Un bureau', hint: 'Une pièce a changé de type.' },
        { id: 'c3', kind: 'count', type: 'cuisine', min: 1, text: 'Une cuisine', hint: '' },
        { id: 'c4', kind: 'count', type: 'sdb', min: 1, text: 'Une salle de bain', hint: '' },
        { id: 'c5', kind: 'area', type: 'salon', min: 22, text: 'Un salon d’au moins 22 m²', hint: 'Le salon a rétréci : rends-lui sa taille.' },
        { id: 'c6', kind: 'window', type: 'salon', side: 'S', min: 2, any: true, text: 'Deux fenêtres au sud dans le salon', hint: '' },
        { id: 'c7', kind: 'awayFromRoad', type: 'chambre', d: 3, text: 'Chambres à 3 m au moins de la route (sud)', hint: '' },
        { id: 'c8', kind: 'window', type: 'chambre', min: 1, text: 'Chaque chambre a une fenêtre', hint: '' },
        { id: 'c9', kind: 'entrance', n: 1, side: 'road', text: 'Une seule entrée, côté route (sud)', hint: '' },
        { id: 'c10', kind: 'reachable', text: 'Toutes les pièces sont accessibles', hint: '' },
        { id: 'c11', kind: 'noThrough', text: 'Jamais besoin de traverser une chambre', hint: '' },
        { id: 'c12', kind: 'totalArea', max: 75, text: 'Maison compacte : 75 m² au maximum', hint: 'Chaque mètre carré compte.' },
        { id: 'c13', kind: 'budget', max: 106, text: 'Budget : 106 k€ maximum', hint: '' },
        { id: 'b1', bonus: true, kind: 'budget', max: 104, text: 'Souhait : rester sous 104 k€', hint: '' },
        { id: 'b2', bonus: true, kind: 'minSide', type: 'chambre', min: 3, text: 'Souhait : des chambres d’au moins 3 m de large', hint: '' },
      ],
    },
    {
      id: 12, title: 'Une maison accessible', w: 14, h: 10, road: 'S', floors: 1, budget: 100, par: 6,
      palette: ['rampe', 'lit2', 'wc', 'lavabo', 'canape', 'table'],
      client: { name: 'Madame Roussel', age: 68, job: 'Retraitée en fauteuil roulant', quote: 'Je me déplace en fauteuil : il me faut une rampe à l’entrée, des pièces assez larges pour manœuvrer et un couloir de 2 mètres.' },
      story: 'Normes d’accessibilité : une rampe devant l’entrée (dans la liste « Meubles et jardin », catégorie Accès), un couloir d’au moins 2 m de large, et des chambres et salles de bain d’au moins 3 m de côté pour tourner un fauteuil.',
      obstacles: [],
      solution: {
        rooms: [
          R('cou', 'couloir', 1, 4, 9, 2, 'N1d N5d S1d S6d W0w E0w'),
          R('ch', 'chambre', 1, 1, 4, 3, 'N1w W1w'),
          R('sdb', 'sdb', 5, 1, 3, 3, 'N1w E1w'),
          R('salon', 'salon', 1, 6, 5, 3, 'W1w S0w S2d E1d'),
          R('cuis', 'cuisine', 6, 6, 4, 3, 'S1w E1w'),
        ],
        items: [I('ramp', 'rampe', 2, 9), I('lit', 'lit2', 1, 1), I('wc', 'wc', 5, 1), I('lav', 'lavabo', 6, 1), I('can', 'canape', 1, 8), I('tab', 'table', 4, 6)],
      },
      muts: [sz('sdb', 2, 3), idl('ramp'), sz('cou', 9, 1), rm('cou', 'N1d')],
      criteria: [
        { id: 'c1', kind: 'count', type: 'chambre', min: 1, text: 'Une chambre', hint: '' },
        { id: 'c2', kind: 'count', type: 'cuisine', min: 1, text: 'Une cuisine', hint: '' },
        { id: 'c3', kind: 'count', type: 'sdb', min: 1, text: 'Une salle de bain', hint: '' },
        { id: 'c4', kind: 'count', type: 'couloir', min: 1, text: 'Un couloir', hint: '' },
        { id: 'c5', kind: 'minSide', type: 'couloir', min: 2, text: 'Couloir large : 2 m de large au moins (norme fauteuil)', hint: 'Passe le couloir à 2 m de large.' },
        { id: 'c6', kind: 'minSide', type: 'sdb', min: 3, text: 'Salle de bain d’au moins 3 m de côté', hint: 'Elle est trop étroite pour manœuvrer.' },
        { id: 'c7', kind: 'minSide', type: 'chambre', min: 3, text: 'Chambre d’au moins 3 m de côté', hint: '' },
        { id: 'c8', kind: 'area', type: 'salon', min: 14, text: 'Un salon d’au moins 14 m²', hint: '' },
        { id: 'c9', kind: 'ramp', text: 'Une rampe d’accès devant l’entrée', hint: 'Ajoute une « Rampe d’accès » et pose-la contre la porte d’entrée, à l’extérieur.' },
        { id: 'c10', kind: 'entrance', n: 1, side: 'road', text: 'Une seule entrée, côté route (sud)', hint: '' },
        { id: 'c11', kind: 'furn', item: 'lit2', room: 'chambre', text: 'Un lit double dans la chambre', hint: '' },
        { id: 'c12', kind: 'furn', item: 'wc', room: 'sdb', text: 'Des WC dans la salle de bain', hint: '' },
        { id: 'c13', kind: 'furn', item: 'lavabo', room: 'sdb', text: 'Un lavabo dans la salle de bain', hint: '' },
        { id: 'c14', kind: 'reachable', text: 'Toutes les pièces sont accessibles', hint: 'Le couloir doit desservir toutes les pièces.' },
        { id: 'c15', kind: 'window', type: 'chambre', min: 1, text: 'La chambre a une fenêtre', hint: '' },
        { id: 'c16', kind: 'budget', max: 100, text: 'Budget : 100 k€ maximum', hint: '' },
        { id: 'b1', bonus: true, kind: 'furn', item: 'table', room: 'salon', text: 'Souhait : une table dans le salon', hint: '' },
        { id: 'b2', bonus: true, kind: 'window', type: 'salon', side: 'S', min: 1, any: true, text: 'Souhait : une fenêtre au sud dans le salon', hint: '' },
      ],
    },
    {
      id: 13, title: 'Les voisins bruyants', w: 14, h: 10, road: 'N', floors: 1, budget: 125, par: 7, neighbors: ['E'],
      palette: ['voiture'],
      client: { name: 'Kévin', age: 31, job: 'Infirmier de nuit', quote: 'Je dors le jour : mes chambres doivent être loin du voisin, loin du bruit de la cuisine et du garage. Et deux sorties, au cas où.' },
      story: 'Une maison voisine longe le terrain à l’est. Garde les chambres à 4 m de ce côté, mets le garage entre elles et le voisin, et prévois une issue de secours : deux sorties sur deux côtés différents.',
      obstacles: [],
      solution: {
        rooms: [
          R('salon', 'salon', 2, 1, 5, 4, 'N1d N3w W1w W2w E1d S1d'),
          R('cuis', 'cuisine', 7, 1, 4, 4, 'N1w N2w'),
          R('gar', 'garage', 11, 1, 2, 4, 'N0w W1d'),
          R('cou', 'couloir', 2, 5, 11, 1, 'S1d S5d E0d'),
          R('c1', 'chambre', 2, 6, 4, 3, 'W1w S1w'),
          R('c2', 'chambre', 6, 6, 4, 3, 'S1w S2w'),
          R('sdb', 'sdb', 10, 6, 3, 3, 'N1d S1w E1w'),
        ],
        items: [I('car', 'voiture', 11, 1)],
      },
      muts: [mv('c2', 4, 0), ty('gar', 'chambre'), rm('cou', 'E0d'), ad('c1', 'W1d')],
      criteria: [
        { id: 'c1', kind: 'count', type: 'chambre', min: 2, text: 'Deux chambres', hint: '' },
        { id: 'c2', kind: 'count', type: 'garage', min: 1, text: 'Un garage', hint: 'Une pièce a changé de type.' },
        { id: 'c3', kind: 'count', type: 'cuisine', min: 1, text: 'Une cuisine', hint: '' },
        { id: 'c4', kind: 'count', type: 'sdb', min: 1, text: 'Une salle de bain', hint: '' },
        { id: 'c5', kind: 'area', type: 'salon', min: 18, text: 'Un salon d’au moins 18 m²', hint: '' },
        { id: 'c6', kind: 'awayFromSide', type: 'chambre', side: 'E', d: 4, text: 'Chambres à 4 m au moins du voisin (est)', hint: 'Le voisin est à droite du plan.' },
        { id: 'c7', kind: 'nearSide', type: 'garage', side: 'E', d: 2, text: 'Le garage fait écran côté voisin (à 2 m de l’est)', hint: '' },
        { id: 'c8', kind: 'notAdjacent', a: 'chambre', b: 'garage', text: 'Aucune chambre ne touche le garage', hint: '' },
        { id: 'c9', kind: 'notAdjacent', a: 'chambre', b: 'cuisine', text: 'Aucune chambre ne touche la cuisine', hint: '' },
        { id: 'c10', kind: 'link', a: 'garage', b: 'cuisine', text: 'Le garage est relié à la cuisine', hint: '' },
        { id: 'c11', kind: 'furn', item: 'voiture', room: 'garage', text: 'La voiture dans le garage', hint: '' },
        { id: 'c12', kind: 'exits', min: 2, sides: 2, text: 'Deux sorties sur deux côtés différents (sécurité incendie)', hint: 'Une porte donnant dehors, ailleurs que sur le côté de l’entrée.' },
        { id: 'c13', kind: 'reachable', text: 'Toutes les pièces sont accessibles', hint: '' },
        { id: 'c14', kind: 'noThrough', text: 'Jamais besoin de traverser une chambre', hint: '' },
        { id: 'c15', kind: 'window', type: 'chambre', min: 1, text: 'Chaque chambre a une fenêtre', hint: '' },
        { id: 'c16', kind: 'budget', max: 125, text: 'Budget : 125 k€ maximum', hint: '' },
        { id: 'b1', bonus: true, kind: 'noWindowSide', type: 'chambre', side: 'E', text: 'Souhait : aucune fenêtre de chambre côté voisin', hint: '' },
        { id: 'b2', bonus: true, kind: 'budget', max: 118, text: 'Souhait : rester sous 118 k€', hint: '' },
      ],
    },
    {
      id: 14, title: 'Les colocataires', w: 14, h: 10, road: 'S', floors: 1, budget: 125, par: 7,
      clients: [
        { name: 'Julie', age: 27, job: 'Infirmière de nuit', quote: 'Je veux du calme et du soleil : un salon bien orienté et ma chambre loin de la route.' },
        { name: 'Cédric', age: 29, job: 'Joueur et télétravailleur', quote: 'Un bureau pour mes écrans, sans reflets, et une chambre qui reçoit le soleil du matin.' },
      ],
      client: { name: 'Julie et Cédric', age: 28, job: 'Deux colocataires', quote: '' },
      story: 'Deux clients, deux ensembles de demandes. Chaque critère porte le nom de celui qui le réclame : il faut contenter les deux avec un seul plan et un seul budget.',
      obstacles: [],
      solution: {
        rooms: [
          R('bur', 'bureau', 1, 1, 3, 3, 'N1w W1w S1d'),
          R('cA', 'chambre', 4, 1, 4, 3, 'N1w N2w S1d'),
          R('cB', 'chambre', 8, 1, 4, 3, 'N1w E1w S1d S3d'),
          R('salon', 'salon', 1, 4, 6, 4, 'W1w W2w S0w S4w S2d E1d'),
          R('cuis', 'cuisine', 7, 4, 4, 4, 'S1w S3w'),
          R('sdb', 'sdb', 11, 4, 2, 4, 'E1w S0w W1d'),
        ],
        items: [],
      },
      muts: [mv('bur', 9, 0), ty('cA', 'garage'), rm('cB', 'S3d'), rm('salon', 'S2d'), sz('salon', 4, 4)],
      criteria: [
        { id: 'c1', kind: 'count', type: 'chambre', min: 2, text: 'Deux chambres, une pour chacun', hint: '' },
        { id: 'c2', kind: 'count', type: 'bureau', min: 1, text: 'Un bureau', hint: '' },
        { id: 'c3', kind: 'count', type: 'cuisine', min: 1, text: 'Une cuisine', hint: '' },
        { id: 'c4', kind: 'count', type: 'sdb', min: 1, text: 'Une salle de bain', hint: '' },
        { id: 'c5', kind: 'area', type: 'salon', min: 22, text: 'Un salon d’au moins 22 m²', hint: '' },
        { id: 'c6', kind: 'entrance', n: 1, side: 'road', text: 'Une seule entrée, côté route (sud)', hint: '' },
        { id: 'c7', kind: 'reachable', text: 'Toutes les pièces sont accessibles', hint: '' },
        { id: 'j1', who: 0, kind: 'window', type: 'salon', side: 'S', min: 2, any: true, text: 'Julie : un salon au soleil, deux fenêtres au sud', hint: '' },
        { id: 'j2', who: 0, kind: 'awayFromRoad', type: 'chambre', d: 5, text: 'Julie : les chambres à 5 m au moins de la route', hint: '' },
        { id: 'j3', who: 0, kind: 'link', a: 'sdb', b: 'chambre', text: 'Julie : une salle de bain reliée à une chambre', hint: '' },
        { id: 'j4', who: 0, kind: 'link', a: 'salon', b: 'cuisine', text: 'Julie : une porte entre le salon et la cuisine', hint: '' },
        { id: 'k1', who: 1, kind: 'window', type: 'bureau', side: 'N', min: 1, text: 'Cédric : le bureau éclairé par le nord (pas de reflets)', hint: '' },
        { id: 'k2', who: 1, kind: 'noWindowSide', type: 'bureau', side: 'S', text: 'Cédric : aucune fenêtre au sud dans le bureau', hint: '' },
        { id: 'k3', who: 1, kind: 'window', type: 'chambre', side: 'E', min: 1, any: true, text: 'Cédric : une chambre avec fenêtre à l’est (soleil du matin)', hint: '' },
        { id: 'k4', who: 1, kind: 'link', a: 'bureau', b: 'salon', text: 'Cédric : le bureau relié au salon par une porte', hint: '' },
        { id: 'c8', kind: 'budget', max: 125, text: 'Budget commun : 125 k€ maximum', hint: '' },
        { id: 'b1', bonus: true, kind: 'budget', max: 118, text: 'Souhait commun : rester sous 118 k€', hint: '' },
        { id: 'b2', bonus: true, kind: 'area', type: 'cuisine', min: 16, text: 'Souhait de Julie : une cuisine de 16 m²', who: 0, hint: '' },
      ],
    },
    {
      id: 15, title: 'Le client qui change d’avis', w: 14, h: 10, road: 'S', floors: 1, budget: 130, par: 7,
      client: { name: 'Monsieur Garnier', age: 52, job: 'Comptable (très indécis)', quote: 'Deux chambres, un beau salon, rien de compliqué. Bon, je reviendrai peut-être vous voir...' },
      story: 'M. Garnier est charmant mais imprévisible. Quand tu auras respecté sa première liste, attends-toi à un coup de théâtre ! Garde de la marge dans ton plan.',
      obstacles: [],
      solution: {
        rooms: [
          R('c1', 'chambre', 1, 1, 4, 3, 'N1w W1w S1d'),
          R('c2', 'chambre', 5, 1, 4, 3, 'N1w S1d'),
          R('c3', 'chambre', 9, 1, 4, 3, 'N1w E1w S0d'),
          R('salon', 'salon', 1, 4, 7, 4, 'W1w W2w S0w S1w S5w S2d E1d'),
          R('cuis', 'cuisine', 8, 4, 4, 4, 'S1w S2w'),
          R('sdb', 'sdb', 12, 4, 2, 4, 'E1w W1d N0d'),
        ],
        items: [],
      },
      muts: [del('c3'), sz('salon', 5, 4), rm('salon', 'S2d'), rm('c1', 'W1w'), rm('c1', 'N1w'), rm('salon', 'S0w'), rm('salon', 'S1w')],
      twist: {
        message: 'Ah, j’allais oublier ! Ma mère vient vivre avec nous : il me faut une troisième chambre, une salle de bain à côté d’une chambre et un plus grand salon.',
        criteria: [
          { id: 't1', kind: 'count', type: 'chambre', min: 3, text: 'NOUVEAU : trois chambres (belle-mère)', hint: 'Utilise « Ajouter une pièce » pour créer une chambre.' },
          { id: 't2', kind: 'area', type: 'salon', min: 26, text: 'NOUVEAU : un salon de 26 m² au moins', hint: '' },
          { id: 't3', kind: 'link', a: 'sdb', b: 'chambre', text: 'NOUVEAU : la salle de bain reliée à une chambre', hint: '' },
        ],
      },
      criteria: [
        { id: 'c1', kind: 'count', type: 'chambre', min: 2, text: 'Au moins deux chambres', hint: '' },
        { id: 'c2', kind: 'count', type: 'cuisine', min: 1, text: 'Une cuisine', hint: '' },
        { id: 'c3', kind: 'count', type: 'sdb', min: 1, text: 'Une salle de bain', hint: '' },
        { id: 'c4', kind: 'area', type: 'salon', min: 22, text: 'Un salon d’au moins 22 m²', hint: '' },
        { id: 'c5', kind: 'window', type: 'salon', side: 'S', min: 1, any: true, text: 'Le salon a une fenêtre au sud', hint: '' },
        { id: 'c6', kind: 'window', type: 'chambre', min: 1, text: 'Chaque chambre a une fenêtre', hint: '' },
        { id: 'c7', kind: 'awayFromRoad', type: 'chambre', d: 3, text: 'Chambres à 3 m au moins de la route (sud)', hint: '' },
        { id: 'c8', kind: 'entrance', n: 1, side: 'road', text: 'Une seule entrée, côté route (sud)', hint: '' },
        { id: 'c9', kind: 'reachable', text: 'Toutes les pièces sont accessibles', hint: '' },
        { id: 'c10', kind: 'budget', max: 130, text: 'Budget : 130 k€ maximum', hint: '' },
        { id: 'b1', bonus: true, kind: 'window', type: 'salon', side: 'S', min: 2, any: true, text: 'Souhait : deux fenêtres au sud dans le salon', hint: '' },
        { id: 'b2', bonus: true, kind: 'link', a: 'salon', b: 'cuisine', text: 'Souhait : une porte entre le salon et la cuisine', hint: '' },
      ],
    },
    {
      id: 16, title: 'Le chef-d’œuvre', w: 14, h: 11, road: 'W', floors: 2, budget: 160, par: 10,
      palette: ['lit1', 'lit2', 'armoire', 'canape', 'table', 'evier', 'plaque', 'frigo', 'baignoire', 'lavabo', 'wc', 'voiture', 'escalier', 'terrasse', 'arbre'],
      client: { name: 'Madame Vasseur', age: 60, job: 'Architecte retraitée (exigeante)', quote: 'Je suis du métier : je veux deux niveaux, une cuisine équipée, un garage, une terrasse et du jardin. Et je surveillerai le budget.' },
      story: 'L’épreuve finale : étage, meubles, jardin et une cliente qui connaît le métier. Elle risque de changer ses exigences en cours de route. Bonne chance, maître.',
      obstacles: [],
      solution: {
        rooms: [
          R('salon', 'salon', 2, 5, 6, 4, 'W1d W2w W3w S1d S3w E1d'),
          R('cuis', 'cuisine', 8, 5, 4, 4, 'E1w E2w S3w'),
          R('gar', 'garage', 8, 1, 4, 4, 'N1w E1w S1d'),
          R('sdb0', 'sdb', 5, 3, 3, 2, 'N1w S1d'),
          R('c1', 'chambre', 2, 5, 4, 3, 'W1w N1w S1d', 1),
          R('c2', 'chambre', 6, 5, 4, 3, 'N1w', 1),
          R('c3', 'chambre', 10, 5, 2, 3, 'E1w S0d', 1),
          R('sdb1', 'sdb', 2, 8, 4, 1, 'W0w S0w E0d', 1),
          R('cou', 'couloir', 6, 8, 6, 1, 'N1d S1w', 1),
        ],
        items: [
          I('can', 'canape', 3, 8), I('tab', 'table', 5, 5), I('esc', 'escalier', 8, 8, 1, 0),
          I('evi', 'evier', 8, 5), I('pla', 'plaque', 10, 5), I('fri', 'frigo', 11, 5),
          I('wc0', 'wc', 5, 3), I('lav0', 'lavabo', 6, 3), I('car', 'voiture', 9, 1),
          I('b1', 'lit2', 2, 5, 0, 1), I('arm', 'armoire', 4, 5, 0, 1), I('b2', 'lit2', 6, 5, 0, 1), I('b3', 'lit1', 10, 5, 0, 1),
          I('bai', 'baignoire', 2, 8, 0, 1), I('lav1', 'lavabo', 4, 8, 0, 1), I('wc1', 'wc', 5, 8, 0, 1),
          I('terr', 'terrasse', 3, 9), I('t1', 'arbre', 12, 9), I('t2', 'arbre', 12, 0),
        ],
      },
      muts: [ifl('b2', 0), idl('evi'), imv('esc', 0, -4), irt('can'), fl('c3', 0), rm('salon', 'W1d'), idl('terr'), imv('t1', -5, -4)],
      twist: {
        message: 'Réflexion faite, j’ai revu mes comptes : je veux deux arbres au jardin, une armoire dans chaque chambre... et que ça coûte moins cher !',
        criteria: [
          { id: 't1', kind: 'garden', item: 'arbre', min: 2, text: 'NOUVEAU : deux arbres dans le jardin', hint: '' },
          { id: 't2', kind: 'furn', item: 'armoire', room: 'chambre', min: 1, text: 'NOUVEAU : une armoire dans une chambre', hint: '' },
          { id: 't3', kind: 'budget', max: 150, text: 'NOUVEAU : budget abaissé à 150 k€', hint: 'Retire ce qui est superflu.' },
        ],
      },
      criteria: [
        { id: 'c1', kind: 'count', type: 'chambre', min: 3, f: 1, text: 'Trois chambres à l’étage', hint: '' },
        { id: 'c2', kind: 'count', type: 'salon', min: 1, f: 0, text: 'Le salon au rez-de-chaussée', hint: '' },
        { id: 'c3', kind: 'count', type: 'sdb', min: 2, text: 'Deux salles de bain', hint: '' },
        { id: 'c4', kind: 'count', type: 'garage', min: 1, text: 'Un garage', hint: '' },
        { id: 'c5', kind: 'furn', item: 'escalier', text: 'Un escalier relie les deux étages', hint: '' },
        { id: 'c6', kind: 'furn', item: 'lit2', room: 'chambre', min: 2, text: 'Deux lits doubles dans les chambres', hint: '' },
        { id: 'c7', kind: 'furn', item: 'evier', room: 'cuisine', text: 'Un évier dans la cuisine', hint: '' },
        { id: 'c8', kind: 'furn', item: 'plaque', room: 'cuisine', text: 'Des plaques dans la cuisine', hint: '' },
        { id: 'c9', kind: 'furn', item: 'baignoire', room: 'sdb', text: 'Une baignoire dans une salle de bain', hint: '' },
        { id: 'c10', kind: 'furn', item: 'canape', room: 'salon', text: 'Un canapé dans le salon', hint: '' },
        { id: 'c11', kind: 'furn', item: 'voiture', room: 'garage', text: 'La voiture dans le garage', hint: '' },
        { id: 'c12', kind: 'garden', item: 'terrasse', min: 1, text: 'Une terrasse', hint: '' },
        { id: 'c13', kind: 'patio', room: 'salon', text: 'Le salon s’ouvre sur la terrasse', hint: '' },
        { id: 'c14', kind: 'link', a: 'garage', b: 'cuisine', text: 'Le garage est relié à la cuisine', hint: '' },
        { id: 'c15', kind: 'entrance', n: 1, side: 'road', text: 'Une seule entrée, côté route (ouest)', hint: 'La porte de la terrasse n’est pas une entrée.' },
        { id: 'c16', kind: 'reachable', text: 'Toutes les pièces sont accessibles', hint: '' },
        { id: 'c17', kind: 'noThrough', text: 'Jamais besoin de traverser une chambre', hint: '' },
        { id: 'c18', kind: 'window', type: 'chambre', min: 1, text: 'Chaque chambre a une fenêtre', hint: '' },
        { id: 'c19', kind: 'area', type: 'salon', min: 22, text: 'Un salon d’au moins 22 m²', hint: '' },
        { id: 'c20', kind: 'budget', max: 160, text: 'Budget : 160 k€ maximum', hint: '' },
        { id: 'b1', bonus: true, kind: 'budget', max: 148, text: 'Souhait : rester sous 148 k€', hint: '' },
        { id: 'b2', bonus: true, kind: 'garden', item: 'arbre', min: 2, text: 'Souhait : deux arbres dans le jardin', hint: '' },
      ],
    },
  ]

  // Niveaux supplémentaires : un fichier par auteur (levels-extra-*.js) qui fournit une fonction (A, H) => [niveaux]
  const H = { R, I, mv, ty, sz, rm, ad, imv, idl, irt, ifl, ity, fl, del }
  if (typeof module === 'object' && module.exports) {
    const fs = require('fs')
    fs.readdirSync(__dirname).filter((f) => /^levels-extra-.*\.js$/.test(f)).sort().forEach((f) => require('./' + f)(A, H).forEach((l) => LEVELS.push(l)))
  } else (globalThis.ArchiExtra || []).forEach((make) => make(A, H).forEach((l) => LEVELS.push(l)))
  LEVELS.sort((p, q) => p.id - q.id)

  // Apparence des clients (portraits dessinés par portraits.js) et réglages de chrono

  const LOOKS = {
    1: { skin: '#f2c9a5', hair: '#6b3b25', hairStyle: 'ponytail', age: 26, clothes: '#4a9bd0', collar: 'shirt' },
    2: { skin: '#e9bd98', hair: '#2f2a28', hairStyle: 'bob', age: 38, clothes: '#c8644a', collar: 'shirt' },
    3: { skin: '#c98f64', hair: '#1c1c1c', hairStyle: 'short', beard: 'stubble', glasses: 'round', age: 33, clothes: '#3d4b66', collar: 'hoodie' },
    4: { skin: '#e8bd9a', hair: '#d8d8d8', hairStyle: 'side', glasses: 'square', age: 74, clothes: '#7a8f5a', collar: 'tie' },
    5: { skin: '#f0c8a8', hair: '#a8442c', hairStyle: 'curly', freckles: true, age: 41, clothes: '#7a5ac0', collar: 'scarf' },
    6: { skin: '#efc5a2', hair: '#c9b27a', hairStyle: 'bob', glasses: 'square', age: 52, clothes: '#1f3a5f', collar: 'shirt' },
    7: { skin: '#f0c6a2', hair: '#8a4b2a', hairStyle: 'long', age: 29, clothes: '#e07a7a', collar: 'shirt' },
    8: { skin: '#f1c9a8', hair: '#c4553b', hairStyle: 'long', freckles: true, age: 35, clothes: '#4caf7d', collar: 'shirt' },
    9: { skin: '#dba67d', hair: '#3b2a21', hairStyle: 'bun', accessory: 'earrings', age: 45, clothes: '#e0a030', collar: 'shirt' },
    10: { skin: '#e8b992', hair: '#7a4a2e', hairStyle: 'short', beard: 'full', age: 40, clothes: '#5a7ab0', collar: 'shirt' },
    11: { skin: '#b9835a', hair: '#2a1c14', hairStyle: 'afro', glasses: 'round', age: 36, clothes: '#d98a2b', collar: 'shirt' },
    12: { skin: '#efd0b5', hair: '#c8c8c8', hairStyle: 'bob', accessory: 'wheelchair', age: 68, clothes: '#8a5aa0', collar: 'scarf' },
    13: { skin: '#e0b08a', hair: '#222222', hairStyle: 'short', beard: 'stubble', age: 31, clothes: '#2f6f6f', collar: 'hoodie' },
    14: [
      { skin: '#f0c9a8', hair: '#d46a8a', hairStyle: 'long', age: 27, clothes: '#7a5ac0', collar: 'shirt' },
      { skin: '#e3b48c', hair: '#7a4a1e', hairStyle: 'spiky', glasses: 'square', accessory: 'headband', age: 29, clothes: '#2e3a4f', collar: 'hoodie' },
    ],
    15: { skin: '#e6bb97', hair: '#555555', hairStyle: 'side', beard: 'moustache', age: 52, clothes: '#4a5a78', collar: 'tie' },
    16: { skin: '#f1cfae', hair: '#8a8a8a', hairStyle: 'bun', glasses: 'round', age: 60, clothes: '#a04050', collar: 'scarf' },
  }
  const CHAPTERS = [
    { title: 'Les bases', from: 1, to: 3 },
    { title: 'Familles et métiers', from: 4, to: 6 },
    { title: 'Aménager et construire', from: 7, to: 10 },
    { title: 'Les grands défis', from: 11, to: 16 },
    { title: 'Projets originaux', from: 17, to: 20 },
    { title: 'Maître architecte', from: 21, to: 26 },
    { title: 'Légendes', from: 27, to: 30 },
  ]
  LEVELS.forEach((lv) => {
    const look = LOOKS[lv.id]
    if (look && lv.clients) lv.clients.forEach((c, i) => (c.look = look[i]))
    else if (look) lv.client.look = look
    const req = lv.criteria.filter((c) => !c.bonus).length + (lv.twist ? lv.twist.criteria.length : 0)
    lv.goldTime = lv.goldTime || 60 + 14 * req // secondes pour la médaille de vitesse
    lv.parMoves = lv.parMoves || lv.par * 4 // nombre d'actions pour la médaille d'efficacité
  })

  // Le plan de départ ne doit jamais avoir de pièces qui se chevauchent : une pièce déplacée par une
  // mutation est reposée sur l'emplacement libre le plus proche (elle reste mal placée par rapport aux critères).
  function relocate(level, plan) {
    const moved = new Set((level.muts || []).filter((m) => ['move', 'size', 'floor'].includes(m.m)).map((m) => m.id))
    const obs = level.obstacles || []
    const fits = (rooms, r, x, y) => {
      for (let yy = y; yy < y + r.h; yy++)
        for (let xx = x; xx < x + r.w; xx++) {
          if (xx < 0 || yy < 0 || xx >= level.w || yy >= level.h) return false
          if (r.f === 0 && obs.some((o) => xx >= o.x && xx < o.x + o.w && yy >= o.y && yy < o.y + o.h)) return false
          if (rooms.some((q) => q !== r && q.f === r.f && xx >= q.x && xx < q.x + q.w && yy >= q.y && yy < q.y + q.h)) return false
          if (r.f === 1 && !rooms.some((q) => q.f === 0 && xx >= q.x && xx < q.x + q.w && yy >= q.y && yy < q.y + q.h)) return false
        }
      return true
    }
    for (const r of plan.rooms) {
      if (!moved.has(r.id)) continue
      if (fits(plan.rooms, r, r.x, r.y)) continue
      let best = null
      for (let y = 0; y <= level.h - r.h; y++)
        for (let x = 0; x <= level.w - r.w; x++) {
          if (!fits(plan.rooms, r, x, y)) continue
          const d = Math.abs(x - r.x) + Math.abs(y - r.y)
          if (!best || d < best.d) best = { x, y, d }
        }
      if (best) { r.x = best.x; r.y = best.y }
    }
    // Éléments de jardin déplacés : même principe (jamais sur la maison, un obstacle ou un autre élément)
    const movedItems = new Set((level.muts || []).filter((m) => m.m === 'imove').map((m) => m.id))
    for (const it of plan.items) {
      if (!movedItems.has(it.id) || !A.ITEMS[it.t].garden) continue
      const ok = (x, y) => {
        const [w, h] = A.itemDims(it)
        for (let yy = y; yy < y + h; yy++)
          for (let xx = x; xx < x + w; xx++) {
            if (xx < 0 || yy < 0 || xx >= level.w || yy >= level.h) return false
            if (obs.some((o) => xx >= o.x && xx < o.x + o.w && yy >= o.y && yy < o.y + o.h)) return false
            if (plan.rooms.some((q) => q.f === 0 && xx >= q.x && xx < q.x + q.w && yy >= q.y && yy < q.y + q.h)) return false
            if (plan.items.some((q) => q !== it && A.ITEMS[q.t].garden && A.itemCells(q).some(([cx, cy]) => cx === xx && cy === yy))) return false
          }
        return true
      }
      if (ok(it.x, it.y)) continue
      const [w, h] = A.itemDims(it)
      let best = null
      for (let y = 0; y <= level.h - h; y++)
        for (let x = 0; x <= level.w - w; x++) {
          if (!ok(x, y)) continue
          const d = Math.abs(x - it.x) + Math.abs(y - it.y)
          if (!best || d < best.d) best = { x, y, d }
        }
      if (best) { it.x = best.x; it.y = best.y }
    }
    return plan
  }

  const startPlan = (level) => relocate(level, A.applyMutations(level.solution, level.muts))
  return { LEVELS, startPlan, CHAPTERS }
})
