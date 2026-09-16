import './style.css';
import { Game } from './engine/Game';

const canvas = document.getElementById('scene');
const hud = document.getElementById('hud');

if (!(canvas instanceof HTMLCanvasElement) || !hud) {
  throw new Error('Missing #scene canvas or #hud element');
}

const game = new Game(canvas, hud);
game.start();

// Expose for the smoke test and debugging.
(window as unknown as { __game?: Game }).__game = game;
