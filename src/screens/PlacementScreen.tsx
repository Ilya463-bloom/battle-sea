import { For, Show, createMemo, createSignal, onCleanup } from 'solid-js';
import { BoardFrame, ShipBody, ShipShape } from '../components/Board';
import { BOARD_SIZE, FLEET_COUNT } from '../game/constants';
import { canPlace, isFleetComplete, remainingSpecs } from '../game/fleet';
import { actions, state } from '../game/state';
import type { Orientation, Ship, ShipSpec } from '../game/types';

interface DragState {
  spec: ShipSpec;
  orientation: Orientation;
  /** Which deck of the ship the pointer grabbed. */
  grabIndex: number;
  fromBoard: boolean;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
}

interface DropTarget {
  candidate: Ship;
  valid: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const DECK_LABEL: Record<number, string> = {
  4: 'Battleship · 4',
  3: 'Cruiser · 3',
  2: 'Destroyer · 2',
  1: 'Boat · 1',
};

export function PlacementScreen() {
  const player = () => state.placingPlayer;
  const ships = () => state.boards[player()].ships;

  const [orientation, setOrientation] = createSignal<Orientation>('h');
  const [drag, setDrag] = createSignal<DragState | null>(null);
  const [rejectedId, setRejectedId] = createSignal<string | null>(null);

  let gridEl: HTMLDivElement | undefined;
  let rejectTimer: ReturnType<typeof setTimeout> | undefined;

  const dockSpecs = createMemo(() => remainingSpecs(ships()));

  /**
   * The ship currently in hand. Its source element stays mounted and is only
   * dimmed — touch pointers hold an implicit capture on the element they started
   * on, and unmounting it mid-drag can swallow `pointermove` and `pointerup`.
   */
  const heldId = () => drag()?.spec.id;

  /** Where the dragged ship would land, given the current pointer position. */
  function computeTarget(state_: DragState): DropTarget | null {
    if (!gridEl) return null;
    const rect = gridEl.getBoundingClientRect();
    const cell = rect.width / BOARD_SIZE;
    const slack = cell; // forgiving edges, especially for fingers
    if (
      state_.x < rect.left - slack ||
      state_.x > rect.right + slack ||
      state_.y < rect.top - slack ||
      state_.y > rect.bottom + slack
    ) {
      return null;
    }

    const rawCol = Math.floor((state_.x - rect.left) / cell);
    const rawRow = Math.floor((state_.y - rect.top) / cell);
    const span = BOARD_SIZE - state_.spec.size;

    const candidate: Ship = {
      ...state_.spec,
      orientation: state_.orientation,
      row:
        state_.orientation === 'h'
          ? clamp(rawRow, 0, BOARD_SIZE - 1)
          : clamp(rawRow - state_.grabIndex, 0, span),
      col:
        state_.orientation === 'h'
          ? clamp(rawCol - state_.grabIndex, 0, span)
          : clamp(rawCol, 0, BOARD_SIZE - 1),
    };

    return { candidate, valid: canPlace(ships(), candidate) };
  }

  const dropTarget = createMemo(() => {
    const current = drag();
    return current ? computeTarget(current) : null;
  });

  const cellPx = () => (gridEl ? gridEl.getBoundingClientRect().width / BOARD_SIZE : 28);

  /** The dragged ship is only drawn under the pointer while it is off the grid. */
  const ghost = createMemo(() => {
    const current = drag();
    return current && current.moved && !dropTarget() ? current : null;
  });

  const ghostStyle = createMemo(() => {
    const current = ghost();
    if (!current) return undefined;
    const cell = cellPx();
    const horizontal = current.orientation === 'h';
    return {
      left: `${current.x - cell / 2 - (horizontal ? current.grabIndex * cell : 0)}px`,
      top: `${current.y - cell / 2 - (horizontal ? 0 : current.grabIndex * cell)}px`,
      width: `${(horizontal ? current.spec.size : 1) * cell}px`,
      height: `${(horizontal ? 1 : current.spec.size) * cell}px`,
    };
  });

  function detachListeners() {
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleUp);
    window.removeEventListener('pointercancel', handleUp);
  }

  function handleMove(event: PointerEvent) {
    setDrag((current) => {
      if (!current) return null;
      const movedEnough =
        current.moved ||
        Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 6;
      return { ...current, x: event.clientX, y: event.clientY, moved: movedEnough };
    });
  }

  function handleUp() {
    const current = drag();
    detachListeners();
    setDrag(null);
    if (!current) return;

    // A tap on a ship already on the board rotates it in place.
    if (!current.moved && current.fromBoard) {
      rotatePlaced(current.spec.id);
      return;
    }

    const target = computeTarget(current);
    if (target?.valid) {
      actions.setPlacement([
        ...ships().filter((ship) => ship.id !== current.spec.id),
        target.candidate,
      ]);
      return;
    }

    // Dropped off the board: send it back to the dock.
    if (!target && current.fromBoard) {
      actions.setPlacement(ships().filter((ship) => ship.id !== current.spec.id));
    }
  }

  function beginDrag(
    spec: ShipSpec,
    shipOrientation: Orientation,
    grabIndex: number,
    fromBoard: boolean,
    event: PointerEvent,
  ) {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    // A second finger must not hijack a drag that is already in progress.
    if (drag()) return;
    event.preventDefault();
    event.stopPropagation();
    setDrag({
      spec,
      orientation: shipOrientation,
      grabIndex,
      fromBoard,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    });
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  }

  function reject(shipId: string) {
    setRejectedId(shipId);
    clearTimeout(rejectTimer);
    rejectTimer = setTimeout(() => setRejectedId(null), 320);
  }

  function rotatePlaced(shipId: string) {
    const ship = ships().find((item) => item.id === shipId);
    if (!ship) return;
    const flipped: Orientation = ship.orientation === 'h' ? 'v' : 'h';
    const span = BOARD_SIZE - ship.size;
    const candidate: Ship = {
      ...ship,
      orientation: flipped,
      row: flipped === 'v' ? clamp(ship.row, 0, span) : ship.row,
      col: flipped === 'h' ? clamp(ship.col, 0, span) : ship.col,
    };
    if (canPlace(ships(), candidate)) {
      actions.setPlacement([...ships().filter((item) => item.id !== ship.id), candidate]);
    } else {
      reject(ship.id);
    }
  }

  function onBoardShipPointerDown(ship: Ship, event: PointerEvent) {
    if (!gridEl) return;
    const rect = gridEl.getBoundingClientRect();
    const cell = rect.width / BOARD_SIZE;
    const col = Math.floor((event.clientX - rect.left) / cell);
    const row = Math.floor((event.clientY - rect.top) / cell);
    const grabIndex = clamp(
      ship.orientation === 'h' ? col - ship.col : row - ship.row,
      0,
      ship.size - 1,
    );
    beginDrag(ship, ship.orientation, grabIndex, true, event);
  }

  function onDockShipPointerDown(spec: ShipSpec, element: HTMLElement, event: PointerEvent) {
    const rect = element.getBoundingClientRect();
    const along =
      orientation() === 'h'
        ? (event.clientX - rect.left) / (rect.width / spec.size)
        : (event.clientY - rect.top) / (rect.height / spec.size);
    beginDrag(spec, orientation(), clamp(Math.floor(along), 0, spec.size - 1), false, event);
  }

  onCleanup(() => {
    detachListeners();
    clearTimeout(rejectTimer);
  });

  const placedCount = () => ships().length;
  const ready = () => isFleetComplete(ships());

  return (
    <div class="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-3 py-4">
      <header class="text-center">
        <h1 class="font-display text-4xl leading-none sm:text-5xl">
          {state.boards[player()].name} — place your fleet
        </h1>
        <p class="mt-1 text-lg text-ink-soft">
          Drag ships onto the grid. Tap a placed ship to turn it. Ships may not touch.
        </p>
      </header>

      <div class="flex w-full flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center">
        <div class="tilt-l w-full max-w-104 shrink-0">
          <BoardFrame
            gridRef={(el) => (gridEl = el)}
            overlay={
              <>
                <For each={ships()}>
                  {(ship) => (
                    <ShipShape
                      ship={ship}
                      draggable
                      dimmed={heldId() === ship.id}
                      nudge={rejectedId() === ship.id}
                      visual={rejectedId() === ship.id ? 'invalid' : 'placed'}
                      onPointerDown={(event) => onBoardShipPointerDown(ship, event)}
                    />
                  )}
                </For>

                <Show when={dropTarget()}>
                  {(target) => (
                    <ShipShape
                      ship={target().candidate}
                      visual={target().valid ? 'selected' : 'invalid'}
                    />
                  )}
                </Show>
              </>
            }
          />
        </div>

        <div class="flex w-full max-w-104 flex-col gap-4 lg:max-w-xs">
          <section class="sketch-alt ink-line ink-double tilt-r bg-paper/70 p-3">
            <div class="mb-2 flex items-baseline justify-between">
              <h2 class="font-display text-3xl leading-none">Dock</h2>
              <span class="text-lg text-ink-soft">
                {placedCount()}/{FLEET_COUNT} placed
              </span>
            </div>

            <Show
              when={dockSpecs().length > 0}
              fallback={
                <p class="py-3 text-center text-xl text-ink-soft">
                  All ships are on the grid. Ready when you are.
                </p>
              }
            >
              <div class="flex flex-wrap items-start gap-x-4 gap-y-3">
                <For each={dockSpecs()}>
                  {(spec) => {
                    let element: HTMLDivElement | undefined;
                    return (
                      <div
                        ref={element}
                        title={DECK_LABEL[spec.size]}
                        class={`no-scroll-touch cursor-grab active:cursor-grabbing ${
                          heldId() === spec.id ? 'opacity-25' : ''
                        }`}
                        style={{
                          width: orientation() === 'h' ? `${spec.size * 1.6}rem` : '1.6rem',
                          height: orientation() === 'h' ? '1.6rem' : `${spec.size * 1.6}rem`,
                        }}
                        onPointerDown={(event) =>
                          element && onDockShipPointerDown(spec, element, event)
                        }
                      >
                        <ShipBody size={spec.size} orientation={orientation()} />
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>
          </section>

          <div class="flex flex-wrap justify-center gap-2 lg:justify-start">
            <button
              type="button"
              class="btn btn-sm"
              onClick={() => setOrientation((value) => (value === 'h' ? 'v' : 'h'))}
            >
              ⟳ {orientation() === 'h' ? 'Across' : 'Down'}
            </button>
            <button type="button" class="btn btn-sm" onClick={() => actions.randomizePlacement()}>
              ⚄ Random
            </button>
            <button
              type="button"
              class="btn btn-sm btn-danger"
              disabled={placedCount() === 0}
              onClick={() => actions.clearPlacement()}
            >
              ✕ Clear
            </button>
          </div>

          <button
            type="button"
            class="btn w-full"
            disabled={!ready()}
            onClick={() => actions.confirmPlacement()}
          >
            {ready() ? '✓ Fleet ready' : `${FLEET_COUNT - placedCount()} ships left`}
          </button>
        </div>
      </div>

      {/* Ghost that follows the pointer while the ship is off the grid. */}
      <Show when={ghost()}>
        {(current) => (
          <div class="pointer-events-none fixed z-50 opacity-80" style={ghostStyle()}>
            <ShipBody
              size={current().spec.size}
              orientation={current().orientation}
              visual="ghost"
            />
          </div>
        )}
      </Show>
    </div>
  );
}
