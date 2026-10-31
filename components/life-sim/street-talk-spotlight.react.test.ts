// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { newLife } from './engine';
import { starterHome } from './home';
import { frontDoorOf, planStreet } from './street';
import { talkScene, talkTarget } from './street-talk';
import { StreetTalkSpotlight } from './street-talk-spotlight';

afterEach(cleanup);

const home = starterHome();
const plan = planStreet({ width: home.width, depth: home.height }, frontDoorOf(home));
const della = talkTarget(plan, plan.people.find((p) => p.name === 'Della')!.id)!;
const scene = talkScene({ ...newLife(), stage: 3, minute: 600 }, della);

it('shows the greeting and every choice, and reports the one you pick', () => {
  const onChoose = vi.fn();
  render(React.createElement(StreetTalkSpotlight, { scene, reply: null, onChoose, onClose: () => {} }));
  expect(screen.getByRole('dialog', { name: /Talking with Della/ })).toBeTruthy();
  expect(screen.getByText(scene.greeting, { exact: false })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Offer a hand/ }));
  expect(onChoose).toHaveBeenCalledWith('help');
  expect(screen.getAllByRole('button').length).toBe(scene.choices.length + 1);
});

it('lets you walk on without choosing', () => {
  const onClose = vi.fn();
  render(React.createElement(StreetTalkSpotlight, { scene, reply: null, onChoose: () => {}, onClose }));
  fireEvent.click(screen.getByRole('button', { name: /Walk on/ }));
  expect(onClose).toHaveBeenCalled();
});

it('shows the outcome, then lets you carry on', () => {
  const onClose = vi.fn();
  render(React.createElement(StreetTalkSpotlight, { scene, reply: 'Della presses a roll into your hand.', onChoose: () => {}, onClose }));
  expect(screen.getByText('Della presses a roll into your hand.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Offer a hand/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Carry on/ }));
  expect(onClose).toHaveBeenCalled();
});
