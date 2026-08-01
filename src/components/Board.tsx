import { For, type JSX } from 'solid-js';
import { BOARD_SIZE, COLUMN_LABELS, ROW_LABELS, cellName } from '../game/constants';
import type { Orientation, Ship } from '../game/types';

const INDEXES = Array.from({ length: BOARD_SIZE }, (_, i) => i);

export interface BoardFrameProps {
  /** Ref to the inner 10×10 grid — pointer math needs its bounding box. */
  gridRef?: (el: HTMLDivElement) => void;
  /** Content drawn inside a single cell (shot marks). */
  cell?: (row: number, col: number) => JSX.Element;
  /** Absolutely positioned layer above the cells (ships, drag preview). */
  overlay?: JSX.Element;
  onCellClick?: (row: number, col: number) => void;
  cellDisabled?: (row: number, col: number) => boolean;
  interactive?: boolean;
  class?: string;
}

export function BoardFrame(props: BoardFrameProps) {
  return (
    <div class={`sketch ink-line ink-double bg-paper/70 p-2 ${props.class ?? ''}`}>
      <div class="grid gap-1" style={{ 'grid-template-columns': '1.35rem 1fr' }}>
        {/* corner */}
        <div />
        <div class="grid grid-cols-10 text-center text-[0.95rem] leading-none text-ink-soft">
          <For each={COLUMN_LABELS}>{(label) => <div>{label}</div>}</For>
        </div>

        <div class="grid grid-rows-10 text-center text-[0.95rem] leading-none text-ink-soft">
          <For each={ROW_LABELS}>
            {(label) => <div class="flex items-center justify-center">{label}</div>}
          </For>
        </div>

        <div
          ref={props.gridRef}
          class="relative grid aspect-square w-full grid-cols-10 grid-rows-10 border-[1.5px] border-ink no-scroll-touch"
        >
          <For each={INDEXES}>
            {(row) => (
              <For each={INDEXES}>
                {(col) => (
                  <button
                    type="button"
                    aria-label={cellName(row, col)}
                    disabled={!props.interactive || props.cellDisabled?.(row, col)}
                    onClick={() => props.onCellClick?.(row, col)}
                    class={`relative flex items-center justify-center border-ink-faint/80 ${
                      row > 0 ? 'border-t' : ''
                    } ${col > 0 ? 'border-l' : ''} ${
                      props.interactive && !props.cellDisabled?.(row, col)
                        ? 'cursor-crosshair hover:bg-ink/10'
                        : 'cursor-default'
                    }`}
                  >
                    {props.cell?.(row, col)}
                  </button>
                )}
              </For>
            )}
          </For>

          {/* Accessed exactly once: a JSX prop is a getter, so reading it twice
              would build a second, unowned copy of the overlay. */}
          <div class="pointer-events-none absolute inset-0">{props.overlay}</div>
        </div>
      </div>
    </div>
  );
}

/** A pen dot: shot into empty water. */
export function MissMark() {
  return <span class="animate-pop block aspect-square w-[24%] rounded-full bg-ink-soft" />;
}

/** A crossed-out cell: shot that found a hull. */
export function HitMark() {
  return (
    <svg viewBox="0 0 20 20" class="animate-pop h-[82%] w-[82%]" aria-hidden="true">
      <g
        stroke="var(--color-red-pen)"
        stroke-width="2.4"
        stroke-linecap="round"
        fill="none"
      >
        <path d="M3.6 3.1 L16.6 17.2" />
        <path d="M16.9 3.4 L3.2 16.8" />
      </g>
    </svg>
  );
}

export type ShipVisual = 'placed' | 'selected' | 'invalid' | 'ghost' | 'sunk' | 'intact';

const VISUAL_CLASS: Record<ShipVisual, string> = {
  placed: 'text-ink border-ink hatch',
  selected: 'text-ink border-ink hatch bg-ink/10',
  invalid: 'text-red-pen border-red-pen hatch-red',
  ghost: 'text-ink border-ink border-dashed',
  sunk: 'text-red-pen border-red-pen hatch-red',
  intact: 'text-ink border-ink hatch',
};

/**
 * A ship drawn over the grid. Positioned in percentages so it scales with the
 * board on any screen size.
 */
export function ShipShape(props: {
  ship: Ship;
  visual?: ShipVisual;
  draggable?: boolean;
  nudge?: boolean;
  /** Drawn faintly while the ship is in hand. */
  dimmed?: boolean;
  onPointerDown?: (event: PointerEvent) => void;
}) {
  const horizontal = () => props.ship.orientation === 'h';
  const visual = () => props.visual ?? 'placed';

  return (
    <div
      class={`absolute p-[3%] ${props.nudge ? 'animate-nudge' : ''} ${props.dimmed ? 'opacity-25' : ''} ${props.draggable ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : 'pointer-events-none'} no-scroll-touch`}
      style={{
        left: `${props.ship.col * 10}%`,
        top: `${props.ship.row * 10}%`,
        width: `${(horizontal() ? props.ship.size : 1) * 10}%`,
        height: `${(horizontal() ? 1 : props.ship.size) * 10}%`,
      }}
      onPointerDown={(event) => props.onPointerDown?.(event)}
    >
      <ShipBody size={props.ship.size} orientation={props.ship.orientation} visual={visual()} />
    </div>
  );
}

/** The hull itself, without any positioning — reused by the dock and the drag ghost. */
export function ShipBody(props: {
  size: number;
  orientation: Orientation;
  visual?: ShipVisual;
}) {
  const visual = () => props.visual ?? 'placed';
  return (
    <div
      class={`sketch flex h-full w-full border-2 ${VISUAL_CLASS[visual()]} ${
        props.orientation === 'h' ? 'flex-row' : 'flex-col'
      }`}
    >
      <For each={Array.from({ length: props.size })}>
        {(_, index) => (
          <div
            class={`flex-1 ${
              index() > 0
                ? `opacity-60 border-current ${props.orientation === 'h' ? 'border-l' : 'border-t'}`
                : ''
            }`}
          />
        )}
      </For>
    </div>
  );
}
