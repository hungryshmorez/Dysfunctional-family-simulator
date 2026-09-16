'use client';
import { useEffect, useRef } from 'react';

// Keep focus inside the uppermost game window and return it when that window closes.
export function useGameDialogs(active:string,onEscape:()=>void):void {
  const close=useRef(onEscape);close.current=onEscape;
  useEffect(()=>{
    if(!active)return;
    const previous=document.activeElement as HTMLElement|null;
    const dialogs=document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
    const dialog=dialogs[dialogs.length-1];if(!dialog)return;
    const controls=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')).filter(e=>e.getClientRects().length>0);
    const background:Array<{element:HTMLElement;inert:boolean}>=[];
    let branch:HTMLElement=dialog;
    while(branch.parentElement&&branch.parentElement!==document.body){for(const node of Array.from(branch.parentElement.children)){if(node!==branch&&node instanceof HTMLElement){background.push({element:node,inert:node.inert});node.inert=true;}}branch=branch.parentElement;}
    dialog.tabIndex=-1;(controls()[0]??dialog).focus();
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close.current();}if(e.key==='Tab'){const list=controls(),first=list[0],last=list.at(-1);if(!first){e.preventDefault();dialog.focus();}else if(e.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first.focus();}}};
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);background.forEach(({element,inert})=>{element.inert=inert;});if(previous?.isConnected&&!previous.inert)previous.focus();};
  },[active]);
}
