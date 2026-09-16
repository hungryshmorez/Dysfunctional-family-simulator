'use client';
export interface Appearance { skin:string;hair:string;shirt:string }
export const DEFAULT_APPEARANCE:Appearance={skin:'#d6a27d',hair:'#352b2b',shirt:'#d8a14c'};
export function parseAppearance(raw:unknown):Appearance|null{
  if(!raw||typeof raw!=='object')return null;const a=raw as Appearance;
  return [a.skin,a.hair,a.shirt].every(v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v))?{skin:a.skin,hair:a.hair,shirt:a.shirt}:null;
}
export function AppearancePanel({value,onChange,onClose,onUploadRig,onClearRig,hasRig}:{value:Appearance;onChange:(next:Appearance)=>void;onClose:()=>void;onUploadRig?:(file:File)=>void;onClearRig?:()=>void;hasRig?:boolean}):JSX.Element{
  return <section className="appearance-panel" aria-label="Character appearance"><div><strong>Your look</strong><button aria-label="Close appearance" onClick={onClose}>×</button></div><p>Make this character yours.</p>{([['skin','Skin tone'],['hair','Hair color'],['shirt','Clothing color']] as const).map(([key,label])=><label key={key}>{label}<input aria-label={label} type="color" value={value[key]} onChange={e=>onChange({...value,[key]:e.target.value})}/></label>)}{onUploadRig&&<div className="appearance-rig"><strong>Your own model</strong><p>{hasRig?'A custom model is in use for your character.':'The built-in character is procedural. Upload a rigged .glb to use your own instead.'}</p><label className="appearance-upload">Upload .glb / .gltf<input aria-label="Upload a character model" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={e=>{const file=e.target.files?.[0];if(file)onUploadRig(file);e.target.value='';}}/></label>{hasRig&&onClearRig&&<button type="button" onClick={onClearRig}>Use the built-in character</button>}</div>}<small>Saved in this browser separately from household backups.</small></section>;
}
