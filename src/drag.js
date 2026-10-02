const DRAG_THRESHOLD = 4;
const NO_DRAG = 'no-drag';
/* Squad rows live in a scrolling list, so on touch a drag has to be told apart
   from a scroll: hold still for a moment to pick the player up, swipe straight
   away to scroll the list. Mouse and the pitch/bench cards start at once. */
const HOLD_MS = 260;
const HOLD_SLOP = 8;
/* Releasing over the pitch but not exactly on a slot snaps to the nearest one
   inside this distance (CSS px). On a phone the slots are tiny. */
const SNAP_RADIUS = 96;

export function createDragController({ onDrop, onTap, onDragStateChange }) {
  let session = null;

  function clearTargetClasses() {
    for (const el of document.querySelectorAll('[data-drop].drop-target, [data-drop].swap-target')) {
      el.classList.remove('drop-target', 'swap-target');
    }
  }

  function nearestSlot(x, y) {
    let best = null;
    let bestDist = SNAP_RADIUS;
    for (const slot of document.querySelectorAll('.slot[data-drop]')) {
      if (slot.style.visibility === 'hidden') continue;
      const rect = (slot.querySelector('.slot-inner') ?? slot).getBoundingClientRect();
      const dist = Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2));
      if (dist < bestDist) {
        best = slot;
        bestDist = dist;
      }
    }
    return best;
  }

  function resolveTarget(x, y) {
    if (document.body.classList.contains('drag-blocked')) return null;
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const target = el.closest('[data-drop]');
    if (target) return target;
    // Over the pitch itself (the canvas or the card overlay) but off any slot.
    if (el.closest('#stagePlay')) return nearestSlot(x, y);
    return null;
  }

  function applyTargetState(target) {
    clearTargetClasses();
    if (!target) return;
    const filled = target.dataset.filled === '1';
    target.classList.add(filled ? 'swap-target' : 'drop-target');
  }

  function start(session0) {
    if (session0.active) return;
    const rect = session0.source.getBoundingClientRect();
    const ghostSource = session0.source.querySelector('[data-ghost-source]');
    let ghost;
    if (ghostSource) {
      ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      ghost.innerHTML = ghostSource.innerHTML;
    } else {
      ghost = session0.source.cloneNode(true);
      ghost.classList.add('drag-ghost');
      ghost.removeAttribute('data-draggable');
    }
    ghost.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ghost);

    session.ghost = ghost;
    session.grabX = session0.startX - rect.left;
    session.grabY = session0.startY - rect.top;
    session0.active = true;
    session0.source.classList.add(NO_DRAG);
    document.body.classList.add('is-dragging');
    moveGhost(session0.lastX, session0.lastY);
    onDragStateChange?.(true);
  }

  function moveGhost(x, y) {
    if (!session.ghost) return;
    const w = session.ghost.offsetWidth;
    const h = session.ghost.offsetHeight;
    const left = Math.min(Math.max(x - session.grabX, 4), window.innerWidth - w - 4);
    const top = Math.min(Math.max(y - session.grabY, 4), window.innerHeight - h - 4);
    session.ghost.style.left = `${left}px`;
    session.ghost.style.top = `${top}px`;
  }

  function finish(commit) {
    if (!session) return;
    const { source, playerId, origin, target } = session;
    clearTimeout(session.holdTimer);
    source.classList.remove(NO_DRAG);
    session.ghost?.remove();
    session = null;
    document.body.classList.remove('is-dragging');
    clearTargetClasses();
    onDragStateChange?.(false);

    if (!commit) return;
    const drop = target?.dataset.drop ?? null;
    onDrop?.({ playerId, origin, drop, from: source });
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const source = event.target.closest?.('[data-draggable]');
    if (!source) return;
    if (event.target.closest('button, a, input, select')) return;

    const needsHold = event.pointerType === 'touch' && source.dataset.origin === 'squad';

    session = {
      source,
      playerId: source.dataset.playerId,
      origin: source.dataset.origin ?? null,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      ghost: null,
      grabX: 0,
      grabY: 0,
      target: null,
      active: false,
      holdPending: needsHold,
      holdTimer: null,
    };

    if (needsHold) {
      const current = session;
      current.holdTimer = setTimeout(() => {
        if (session !== current || current.active) return;
        current.holdPending = false;
        start(current);
        navigator.vibrate?.(8);
      }, HOLD_MS);
    }

    try {
      source.setPointerCapture(event.pointerId);
    } catch {
      /* capture is best effort */
    }
  }

  function onPointerMove(event) {
    if (!session || event.pointerId !== session.pointerId) return;
    session.lastX = event.clientX;
    session.lastY = event.clientY;

    if (!session.active) {
      const moved = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
      if (session.holdPending) {
        if (moved > HOLD_SLOP) {
          // The finger moved before the hold finished: the user is scrolling the
          // list. Drop the session and let the browser have the gesture.
          clearTimeout(session.holdTimer);
          session = null;
        }
        return;
      }
      if (moved < DRAG_THRESHOLD) return;
      start(session);
      if (!session.active) return;
    }

    event.preventDefault();
    moveGhost(event.clientX, event.clientY);
    session.target = resolveTarget(event.clientX, event.clientY);
    applyTargetState(session.target);
  }

  function onPointerUp(event) {
    if (!session || event.pointerId !== session.pointerId) return;
    const wasActive = session.active;
    const payload = { playerId: session.playerId, origin: session.origin, from: session.source };
    if (wasActive) {
      session.target = resolveTarget(event.clientX, event.clientY);
      finish(true);
    } else {
      finish(false);
      onTap?.(payload);
    }
  }

  function onPointerCancel(event) {
    if (!session || event.pointerId !== session.pointerId) return;
    finish(false);
  }

  function onKeyDown(event) {
    if (event.key === 'Escape' && session?.active) finish(false);
  }

  document.addEventListener('pointerdown', onPointerDown, { passive: true });
  document.addEventListener('pointermove', onPointerMove, { passive: false });
  /* touch-action: pan-y on the squad rows lets the list scroll; once the hold
     has picked a player up, this stops the same finger from also scrolling. */
  document.addEventListener(
    'touchmove',
    (event) => {
      if (session?.active && event.cancelable) event.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener('contextmenu', (event) => {
    if (session && event.target.closest?.('[data-draggable]')) event.preventDefault();
  });
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerCancel);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('blur', () => finish(false));

  return {
    get dragging() {
      return Boolean(session?.active);
    },
    cancel() {
      finish(false);
    },
  };
}