"use client";
import dynamic from 'next/dynamic';
const LifeGame=dynamic(()=>import('@/components/life-sim/life-game').then(m=>{(window as unknown as {__pcReady:boolean}).__pcReady=true;return m;}),{ssr:false,loading:()=> <main className="life-loading">Opening your life…</main>});
export default function Page(){return <LifeGame/>;}
