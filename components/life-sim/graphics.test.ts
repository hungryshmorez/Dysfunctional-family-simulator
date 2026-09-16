// @vitest-environment jsdom
import { beforeEach,expect,it,vi } from 'vitest';
const factory=vi.hoisted(()=>vi.fn());
vi.mock('three',()=>({WebGLRenderer:class{constructor(options:unknown){return factory(options);}}}));
import { startGraphics } from './graphics';
beforeEach(()=>{factory.mockReset();});
it('retries without antialiasing when the normal context fails',()=>{
  const renderer={};factory.mockImplementationOnce(()=>{throw new Error('No multisampling');}).mockReturnValueOnce(renderer);
  expect(startGraphics()).toEqual({renderer,reducedQuality:true});
  expect(factory.mock.calls[0]![0].antialias).toBe(true);expect(factory.mock.calls[1]![0].antialias).toBe(false);
});
it('preserves the browser context-creation reason when both attempts fail',()=>{
  factory.mockImplementation(({canvas}:{canvas:HTMLCanvasElement})=>{canvas.dispatchEvent(Object.assign(new Event('webglcontextcreationerror'),{statusMessage:'Graphics disabled by browser'}));throw new Error('Could not create context');});
  expect(()=>startGraphics()).toThrow('Graphics disabled by browser');expect(factory).toHaveBeenCalledTimes(2);
});
