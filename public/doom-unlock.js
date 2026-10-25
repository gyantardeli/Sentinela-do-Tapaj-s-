// Cinco ativações consecutivas do símbolo ST liberam o easter egg.
const symbol = document.getElementById('sentinela-symbol');
if (symbol) {
  let count = 0;
  let last = 0;
  symbol.addEventListener('click', () => {
    const now = Date.now();
    count = now - last > 4500 ? 1 : count + 1;
    last = now;
    if (count >= 5) window.location.assign('/doom');
  });
}
