/* Add this script to a page you control. Set data-game-origin to the exact game origin. */
(function(){
  const script=document.currentScript;
  const allowedOrigin=script?.dataset.gameOrigin;
  const q=new URLSearchParams(location.search),nonce=q.get('ys_nonce'),claimedOrigin=q.get('ys_game_origin');
  if(!allowedOrigin||claimedOrigin!==allowedOrigin||!nonce||!/^[a-zA-Z0-9-]{20,80}$/.test(nonce)||parent===window)return;
  try{const u=new URL(allowedOrigin);if(u.origin!==allowedOrigin||!['https:','http:'].includes(u.protocol))return;}catch{return;}
  const confirm=()=>parent.postMessage({type:'yourspace:visit',nonce},allowedOrigin);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',confirm,{once:true});else confirm();
})();
