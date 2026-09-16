'use client';
import { useEffect } from 'react';
import { RoomOrganizer } from '@/components/room-organizer';

export default function DesignEditor({onReady}:{onReady:()=>void}):JSX.Element{
  useEffect(()=>{(window as unknown as {__pcReady:boolean}).__pcReady=true;onReady();},[onReady]);
  return <RoomOrganizer/>;
}
