import { FURNITURE_CATALOG } from '@/components/room-organizer/lib/constants';
import type { FurnitureItem, RoomLayout } from '@/components/room-organizer/lib/types';
// The family trailer: an 18 × 10 m double-wide with its long axis running east
// to west, so the west end faces the street. Five people need somewhere to
// sleep, so the north side is a row of four bedrooms — the parents' room, a
// shared room with two beds for the older and younger siblings, your own room
// in the middle, and a spare — off a living room (at the street end, by the
// front door), kitchen, dining table and a walled bathroom.
// Doorways are the gaps left in the interior-wall segments; navigation.ts treats
// a wall as solid unless a gap (or a door item) sits in the way. The front door
// is a `door` item on the west wall: it cuts the doorway through the shell and
// the exterior skin, and the world lets you step out through it.
export const TRAILER_NAME = 'The family trailer';
export const FRONT_DOOR = { x: -9, z: 1.7, width: 1 } as const;
export function starterHome():RoomLayout {
  const specs:[string,number,number,string?,number?][]=[
    // Bedrooms (north band). Beds sit against the top wall so each room's
    // south half stays clear for the doorway.
    ['bed',-7,-3.9,'#e2d5bd'],        // Parents (Dana & Morgan)
    ['bed',-3.5,-3.9,'#cdd7e0'],      // Casey — shared kids' room
    ['bed',-0.5,-3.9,'#e0d3cd'],      // Riley — shared kids' room
    ['bed',3,-3.9,'#d8e0cd'],         // You (middle child)
    ['bed',7,-3.9,'#e0dccd'],         // Spare room
    // Living room (west, at the street end).
    ['sofa',-6,1,'#79948b'],['rug',-6,2.2,'#d2b98f'],['coffee-table',-6,2.4,'#ac8863'],
    ['tv',-6,4.6],['bookshelf',-8.2,0,'#b99b78'],['floor-lamp',-8.4,3.4],['plant',-8.4,4.5],
    ['computer',-2.5,-0.4],
    // Dining (center).
    ['table',0.5,2,'#c3a47e'],['dining-chair',0.5,3.2,'#a0afa0',Math.PI],['dining-chair',0.5,0.8,'#a0afa0'],
    // Kitchen (east wall).
    ['fridge',8.3,-0.4],['stove',8.3,0.7],['counter',8.4,2.13,'#c6d0c4',Math.PI/2],['kitchen-sink',6.9,-0.5],
    // Bathroom (walled, south-east).
    ['shower',8.1,4.2,'#d7e7e7'],['toilet',5.4,4.5],['bathroom-sink',5.3,3.5],
    // Front door (west wall, street end) and windows. These sit on the wall
    // planes: they cut openings through the shell and are never obstacles.
    ['door',FRONT_DOOR.x,FRONT_DOOR.z,'#6d4c41',Math.PI/2],
    ['window',-7,-5,undefined,0],['window',-2,-5,undefined,0],['window',3,-5,undefined,0],['window',7,-5,undefined,0],
    ['window',-6,5,undefined,Math.PI],['window',-1.5,5,undefined,Math.PI],['window',2.8,5,undefined,Math.PI],
    ['window',9,1.5,undefined,-Math.PI/2],['window',-9,-3.2,undefined,Math.PI/2],
  ];
  const items: FurnitureItem[]=specs.map(([type,x,z,color,rotation],i)=>({...FURNITURE_CATALOG.find(c=>c.type===type)!,id:'home-'+i,position:{x,z},rotation:rotation??0,...(color?{color}:{}),...(type==='computer'?{width:1.2,depth:.65}:{} ),...(type==='door'?{width:FRONT_DOOR.width}:{} )}));
  return {name:TRAILER_NAME,width:18,height:10,roof:{style:'none'},floors:[{id:'ground',name:'Home',floorColor:'#d8c3a5',floorPattern:'wood',wallColors:{north:'#e6e5dc',west:'#b4c7bd',east:'#e6e5dc',south:'#e6e5dc'},interiorWalls:[
    // Bedroom dividers (full height of the north band).
    {id:'br-div-1',x1:-5,z1:-5,x2:-5,z2:-1.2,color:'#becfc4'},
    {id:'br-div-2',x1:1,z1:-5,x2:1,z2:-1.2,color:'#becfc4'},
    {id:'br-div-3',x1:5,z1:-5,x2:5,z2:-1.2,color:'#becfc4'},
    // North partition separating bedrooms from the living space, with a doorway
    // gap centered on each bedroom.
    {id:'br-wall-1',x1:-9,z1:-1.2,x2:-7.7,z2:-1.2,color:'#becfc4'},
    {id:'br-wall-2',x1:-6.3,z1:-1.2,x2:-2.7,z2:-1.2,color:'#becfc4'},
    {id:'br-wall-3',x1:-1.3,z1:-1.2,x2:2.3,z2:-1.2,color:'#becfc4'},
    {id:'br-wall-4',x1:3.7,z1:-1.2,x2:5.2,z2:-1.2,color:'#becfc4'},
    {id:'br-wall-5',x1:6.4,z1:-1.2,x2:9,z2:-1.2,color:'#becfc4'},
    // Bathroom walls with a doorway gap in the north wall.
    {id:'bath-north-1',x1:4.5,z1:3,x2:6,z2:3,color:'#d8e4e3'},
    {id:'bath-north-2',x1:7.2,z1:3,x2:9,z2:3,color:'#d8e4e3'},
    {id:'bath-west',x1:4.5,z1:3,x2:4.5,z2:5,color:'#d8e4e3'},
  ],items}]};
}
export function homeCost(h:RoomLayout):number{return h.floors.reduce((s,f)=>s+f.items.reduce((n,i)=>n+(i.price??0),0),0);}
