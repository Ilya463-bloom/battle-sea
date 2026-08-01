/**
 * Renders every screen to a string in Node, without a browser.
 *
 * It cannot judge how the game looks, but it does prove that each screen mounts
 * without throwing and that the text a player must see is actually in the markup.
 * Run with `npm run check:render`.
 */
import { renderToString } from 'solid-js/web';
import { App } from '../src/App';
import { BOARD_SIZE } from '../src/game/constants';
import { shipCells } from '../src/game/fleet';
import { actions, state } from '../src/game/state';

let failures = 0;

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

interface Rendered {
  html: string;
  /** Visible text, with Solid's hydration markers and markup stripped out. */
  text: string;
}

function screen(label: string): Rendered {
  let html: string;
  try {
    html = renderToString(App);
  } catch (error) {
    failures++;
    console.log(`  FAIL  ${label} threw — ${(error as Error).message}`);
    return { html: '', text: '' };
  }
  console.log(`  ok    ${label} renders`);
  return { html, text: toText(html) };
}

/**
 * Solid wraps every dynamic insert in comment markers, so a sentence like
 * `{name} wins!` never appears as one contiguous string in the raw markup.
 */
function toText(html: string): string {
  return html
    .replace(/<!--.*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every board draws 100 cells, each labelled A1…J10. */
function countCells(html: string): number {
  return (html.match(/aria-label="[A-J](10|[1-9])"/g) ?? []).length;
}

console.log('\n1. title screen');
{
  const intro = screen('intro');
  check('shows the title', intro.text.includes('Sea Battle'));
  check('shows the start button', intro.text.includes('Start game'));
  check('lists the rules', intro.text.includes('may never touch'));
}

console.log('\n2. placement screen');
{
  actions.startGame();
  const empty = screen('placement, empty dock');
  const cells = countCells(empty.html);
  check('names the player', empty.text.includes('Player 1 — place your fleet'));
  check('draws one 10×10 grid', cells === BOARD_SIZE * BOARD_SIZE, `${cells} cells`);
  check('the confirm button is a counter while ships are missing', empty.text.includes('10 ships left'));
  check('shows the dock', empty.text.includes('Dock') && empty.text.includes('0/10 placed'));

  actions.randomizePlacement();
  const full = screen('placement, fleet ready');
  check('the confirm button unlocks', full.text.includes('Fleet ready'));
  check('the dock is reported empty', full.text.includes('All ships are on the grid'));
}

console.log('\n3. handoff screens');
{
  actions.confirmPlacement();
  const toSecond = screen('handoff before player 2 places');
  check('asks for player 2', toSecond.text.includes('to Player 2'));
  check("says player 1's fleet is hidden", toSecond.text.includes("Player 1's fleet is hidden"));

  actions.continueAfterHandoff();
  const second = screen('placement for player 2');
  check('names player 2', second.text.includes('Player 2 — place your fleet'));

  actions.randomizePlacement();
  actions.confirmPlacement();
  const toBattle = screen('handoff before the battle');
  check('hands the device back to player 1', toBattle.text.includes('to Player 1'));
  check('announces both fleets are ready', toBattle.text.includes('Both fleets are ready'));
}

console.log('\n4. battle screen');
{
  actions.continueAfterHandoff();
  const opening = screen('battle, first shot');
  check('names the shooter', opening.text.includes('Now shooting') && opening.text.includes('Player 1'));
  check("labels the target as the opponent's waters", opening.text.includes("Player 2's waters"));
  check('counts the enemy fleet', opening.text.includes('10 ships left'));
  check('draws one 10×10 grid', countCells(opening.html) === BOARD_SIZE * BOARD_SIZE);
  check('prompts for a shot', opening.text.includes('Pick a square'));

  // Sink one ship without ever missing, so the turn stays put.
  const victim = state.boards[1].ships.find((item) => item.size === 1);
  if (!victim) throw new Error('the pool always contains one-deck boats');
  const cell = shipCells(victim)[0];
  actions.fire(cell.row, cell.col);

  const afterSink = screen('battle, after a sunk boat');
  check('reports the sinking', afterSink.text.includes('Sunk her'));
  check('the enemy fleet counter drops', afterSink.text.includes('9 ships left'));
  check('the shooter keeps the turn', state.currentPlayer === 0);
}

console.log('\n5. result screen');
{
  for (const item of state.boards[1].ships) {
    for (const cell of shipCells(item)) actions.fire(cell.row, cell.col);
  }
  check('the game ended', state.phase === 'over');

  const result = screen('result');
  check('announces the winner', result.text.includes('Player 1 wins!'));
  check('offers a rematch', result.text.includes('Play again'));
  check('reveals both boards', countCells(result.html) === BOARD_SIZE * BOARD_SIZE * 2);
  check('reports the shot count', result.text.includes('20 shots fired'));
}

console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
