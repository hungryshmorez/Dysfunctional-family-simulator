// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { DinnerSpotlight } from './dinner-spotlight';
import { DirectedSceneSpotlight } from './directed-scene-spotlight';
import { newLife } from './engine';
import { starterHome } from './home';
import { blankStoryCard } from './story-cards';
import { startStoryCard } from './story-director';
import { approveStoryDraft, saveStoryDraft } from './story-workshop';
import type { LifeState } from './engine';

afterEach(cleanup);

it('plays an active directed scene on the spotlight and fires the choice', () => {
  let s: LifeState = { ...newLife(), stage: 3, job: 'story-editor' };
  const card = blankStoryCard('Alex', 'spotlight-card');
  card.choices[0].consequence = 'Trust grows when you tell the truth.';
  card.choices[1].consequence = 'The lie gets heavier to carry.';
  s = approveStoryDraft(saveStoryDraft(s, card), card.id, 'Alex', card.choices);
  s = startStoryCard(s, card.id);
  const scene = s.director.active!;
  expect(scene).not.toBeNull();

  const onChoose = vi.fn();
  render(React.createElement(DirectedSceneSpotlight, { life: s, scene, onChoose, onClose: () => {} }));
  fireEvent.click(screen.getByRole('button', { name: card.choices[0].answer }));
  expect(onChoose).toHaveBeenCalledWith(scene.id, 'answer-a');
});

it('renders dinner as a five-seat table scene with both choices', () => {
  const life: LifeState = { ...newLife(), stage: 2 };
  const onDinner = vi.fn();
  render(React.createElement(DinnerSpotlight, { life, home: starterHome(), busy: false, onDinner, onClose: () => {} }));
  expect(screen.getAllByLabelText(/Dinner seat/)).toHaveLength(5);
  expect(screen.getByRole('button', { name: /Give everyone a turn/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /Back the favorites/ })).toBeTruthy();
});
