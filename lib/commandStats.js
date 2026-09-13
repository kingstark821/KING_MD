// Compteur volontairement en mémoire : c'est une statistique "depuis le dernier
// redémarrage", pas une métrique qui doit survivre — donc pas besoin de fichier/DB ici.
let count = 0;
const startedAt = Date.now();

function increment() {
    count += 1;
}

function getStats() {
    return { count, startedAt };
}

module.exports = { increment, getStats };
