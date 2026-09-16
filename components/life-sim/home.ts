import { FURNITURE_CATALOG } from '@/components/room-organizer/lib/constants';
import type { FurnitureItem, RoomLayout } from '@/components/room-organizer/lib/types';
export function starterHome():RoomLayout {
  const specs:[string,number,number,string?,number?][]=[
    ['bed',-3.8,-3.3,'#e2d5bd'],['nightstand',-2.3,-3.4,'#b18a65'],
    ['shower',4.8,-4,'#d7e7e7'],['toilet',2.7,-3.5],['bathroom-sink',4.9,-2.3],
    ['fridge',5.35,-.7],['stove',5.3,.3],['counter',5.5,1.45,'#c6d0c4',Math.PI/2],
    ['kitchen-sink',5.5,2.6,undefined,Math.PI/2],
    ['sofa',-3.1,.6,'#79948b'],['rug',-3.1,1.6,'#d2b98f'],['tv',-3.1,3.7],
    ['coffee-table',-3.1,2,'#ac8863'],['computer',.1,-3.7],['bookshelf',-5.5,.2,'#b99b78'],
    ['plant',4.5,4],['floor-lamp',-4.8,2.5],
    ['table',1.5,2.4,'#c3a47e'],['dining-chair',1.5,3.3,'#a0afa0',Math.PI],
    ['dining-chair',1.5,1.5,'#a0afa0'],
  ];
  const items: FurnitureItem[]=specs.map(([type,x,z,color,rotation],i)=>({...FURNITURE_CATALOG.find(c=>c.type===type)!,id:'home-'+i,position:{x,z},rotation:rotation??0,...(color?{color}:{}),...(type==='computer'?{width:1.2,depth:.65}:{} )}));
  return {name:'Your first home',width:12,height:10,roof:{style:'none'},floors:[{id:'ground',name:'Home',floorColor:'#d8c3a5',floorPattern:'wood',wallColors:{north:'#e6e5dc',west:'#b4c7bd',east:'#e6e5dc',south:'#e6e5dc'},interiorWalls:[
    {id:'bedroom-side',x1:-1.5,z1:-5,x2:-1.5,z2:-1,color:'#becfc4'},
    {id:'bedroom-front-left',x1:-6,z1:-1,x2:-3,z2:-1,color:'#becfc4'},
    {id:'bedroom-front-right',x1:-1.8,z1:-1,x2:-1.5,z2:-1,color:'#becfc4'},
    {id:'bath-side',x1:1.8,z1:-5,x2:1.8,z2:-1.6,color:'#d8e4e3'},
    {id:'bath-front-left',x1:1.8,z1:-1.6,x2:3.1,z2:-1.6,color:'#d8e4e3'},
    {id:'bath-front-right',x1:4.3,z1:-1.6,x2:6,z2:-1.6,color:'#d8e4e3'},
  ],items}]};
}
export function homeCost(h:RoomLayout):number{return h.floors.reduce((s,f)=>s+f.items.reduce((n,i)=>n+(i.price??0),0),0);}
