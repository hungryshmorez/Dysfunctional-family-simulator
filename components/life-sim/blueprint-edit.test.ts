// @vitest-environment jsdom
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { saveLayout,loadLayout } from '@/components/room-organizer/lib/persistence';
import { starterHome } from './home';
import { beginDesign,blankDesign,DRAFT_KEY,editBlueprint,emptyProperties,loadProperties,placeBlueprint,PROPERTY_KEY,renameBlueprint,saveBlueprint,saveProperties } from './properties';

beforeEach(()=>localStorage.clear());afterEach(()=>vi.restoreAllMocks());
describe('saved house editing',()=>{
  it('renames the shelf copy without changing a placed house',()=>{
    const p=saveBlueprint(emptyProperties(),starterHome(),'Original');const placed=placeBlueprint(p,p.blueprints[0]!.id,0);
    const renamed=renameBlueprint(placed,p.blueprints[0]!.id,' New name ');
    expect(renamed.blueprints[0]!.layout.name).toBe('New name');expect(renamed.lots[0]!.name).toBe('Original');expect(p.blueprints[0]!.name).toBe('Original');
  });
  it('backs up the old draft and opens an independent editable copy',()=>{
    const p=saveBlueprint(emptyProperties(),starterHome(),'Saved home');saveProperties(p);saveLayout(blankDesign(),DRAFT_KEY);
    editBlueprint(p.blueprints[0]!.id);beginDesign();
    expect(loadLayout(DRAFT_KEY)?.name).toBe('Saved home');expect(loadLayout(DRAFT_KEY+'-before-edit')?.name).toBe('My house design');
    const edited=loadLayout(DRAFT_KEY)!;edited.floors[0]!.items=[];saveLayout(edited,DRAFT_KEY);
    expect(loadProperties().blueprints[0]!.layout.floors[0]!.items.length).toBeGreaterThan(0);
  });
  it('restores the draft if the new contract cannot be saved',()=>{
    const p=saveBlueprint(emptyProperties(),starterHome(),'Saved home');saveProperties(p);saveLayout(blankDesign(),DRAFT_KEY);
    const original=Storage.prototype.setItem;
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(this:Storage,key,value){if(key===PROPERTY_KEY)throw new Error('Storage full');original.call(this,key,value);});
    expect(()=>editBlueprint(p.blueprints[0]!.id)).toThrow('Storage full');expect(loadLayout(DRAFT_KEY)?.name).toBe('My house design');
  });
});
