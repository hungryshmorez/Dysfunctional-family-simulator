// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {newLife} from './engine';
import type {LifeState} from './engine';
import {blankStoryCard} from './story-cards';
import {startStoryCard} from './story-director';
import {StoryDirectorPanel} from './story-director-panel';
import {saveStoryDraft,approveStoryDraft} from './story-workshop';
import {StoryWorkshopPanel} from './story-workshop-panel';
afterEach(cleanup);
it('locks saved answers and requires both written repercussions before approval',()=>{
  function Harness(){const [life,setLife]=React.useState<LifeState>({...newLife(),stage:3,job:'story-editor'});return React.createElement(StoryWorkshopPanel,{life,onClose:()=>{},onSave:card=>setLife(s=>saveStoryDraft(s,card)),onApprove:(id,reviewer,choices)=>setLife(s=>approveStoryDraft(s,id,reviewer,choices)),onImport:()=>{},onPlay:()=>{}});}
  render(React.createElement(Harness));
  fireEvent.click(screen.getByRole('button',{name:'Save answers for review'}));
  expect((screen.getByLabelText('The question') as HTMLTextAreaElement).disabled).toBe(true);
  const approve=screen.getByRole('button',{name:'Approve consequences · earn $120'}) as HTMLButtonElement;expect(approve.disabled).toBe(true);
  const inputs=screen.getAllByLabelText('What is the repercussion?');
  fireEvent.change(inputs[0]!,{target:{value:'Your sibling learns to trust your honesty.'}});
  fireEvent.change(inputs[1]!,{target:{value:'The secret creates tension between the siblings.'}});
  expect(approve.disabled).toBe(false);fireEvent.click(approve);
  expect(screen.getByText('Reviewed by Alex')).toBeTruthy();expect(approve.disabled).toBe(true);
});
it('shows player-written answers rather than the default episode responses',()=>{
  let s:LifeState={...newLife(),stage:3,job:'story-editor'};const card=blankStoryCard('Alex','ui-card');
  card.choices[0].consequence='Trust grows when you help tell the truth.';card.choices[1].consequence='The lie becomes harder to keep.';
  s=approveStoryDraft(saveStoryDraft(s,card),card.id,'Alex',card.choices);s=startStoryCard(s,card.id);
  const onChoice=vi.fn();render(React.createElement(StoryDirectorPanel,{life:s,busy:false,onMode:()=>{},onChoice,onWait:()=>{},onError:()=>{}}));
  fireEvent.click(screen.getByRole('button',{name:card.choices[0].answer}));
  expect(onChoice).toHaveBeenCalledWith(s.director.active!.id,'answer-a');
  expect(screen.queryByRole('button',{name:'Offer help with a clear limit'})).toBeNull();
});

it('filters the expanded catalog by theme and episode title',()=>{
  render(React.createElement(StoryWorkshopPanel,{life:{...newLife(),stage:3},onClose:()=>{},onSave:()=>{},onApprove:()=>{},onImport:()=>{},onPlay:()=>{}}));
  fireEvent.click(screen.getByText('Add a playable episode'));
  fireEvent.change(screen.getByLabelText('Scenario pack'),{target:{value:'Medical proxies'}});
  expect(screen.getByText('10 episodes in this view')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Find a scenario'),{target:{value:'proxy war'}});
  expect(screen.getByText('1 episodes in this view')).toBeTruthy();expect(screen.getByText('The proxy war')).toBeTruthy();
  expect(screen.queryByText('The grim math')).toBeNull();
});
