import { store } from './store.js';
import { benchCardHTML } from './cards.js';
import { t } from './i18n.js';
import { esc } from './util.js';

export function createBench({ bench, track, subLabel }) {
  function render() {
    const team = store.activeTeam;
    const subs = store.substitutes();
    bench.classList.toggle('has-subs', subs.length > 0);
    track.innerHTML = subs.map((player) => benchCardHTML(player, team)).join('');
    if (subLabel) {
      subLabel.innerHTML = subs.length
        ? `${esc(t('bench.count', { count: subs.length }))} &middot; ${esc(t('bench.dragUp'))}`
        : esc(t('bench.sub'));
    }
  }

  return { render };
}