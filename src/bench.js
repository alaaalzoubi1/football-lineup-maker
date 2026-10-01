import { store } from './store.js';
import { benchCardHTML } from './cards.js';

export function createBench({ bench, track, subLabel }) {
  function render() {
    const team = store.activeTeam;
    const subs = store.substitutes();
    bench.classList.toggle('has-subs', subs.length > 0);
    track.innerHTML = subs.map((player) => benchCardHTML(player, team)).join('');
    if (subLabel) {
      const count = subs.length;
      subLabel.textContent = count
        ? `${count} substitute${count === 1 ? '' : 's'} &middot; drag onto the pitch to field them`
        : 'Drag a player off the pitch to bench them';
    }
  }

  return { render };
}