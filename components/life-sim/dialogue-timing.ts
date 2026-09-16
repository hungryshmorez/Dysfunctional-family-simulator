import type {DialogueLine} from './story-director-state';
const duration=(line:DialogueLine)=>Math.min(35,Math.max(4,line.text.trim().split(/\s+/).length/3));
export function dialogueDuration(lines:DialogueLine[]):number{return lines.reduce((total,line)=>total+duration(line),0);}
export function dialogueAt(lines:DialogueLine[],elapsed:number):DialogueLine|null{
  let end=0;for(const line of lines){end+=duration(line);if(elapsed<end)return line;}return null;
}
