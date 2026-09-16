// The native engine calls back into its host during init, even in a paused mission.
// Install its host adapter BEFORE init. Micropolis owns and deletes this callback.
export function createSimulation(engine) {
  const sim=new engine.Micropolis();
  const host=new Proxy({}, {get:()=>()=>{}});
  const callback=new engine.JSCallback(host);
  sim.setCallback(callback,null);
  sim.init();sim.clearMap();sim.setFunds(10000);sim.setAutoBulldoze(true);
  sim.setEnableDisasters(false);sim.setEnableSound(false);sim.setSpeed(0);
  return sim;
}
