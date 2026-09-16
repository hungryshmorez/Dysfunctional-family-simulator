function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open('yourspace-studio',1);r.onupgradeneeded=()=>r.result.createObjectStore('samples');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function storedSample(file?:File):Promise<File|null>{
  const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('samples',file?'readwrite':'readonly');const r=file?tx.objectStore('samples').put(file,'pad'):tx.objectStore('samples').get('pad');let value:File|null=null;r.onsuccess=()=>{value=file??r.result??null;};tx.oncomplete=()=>{db.close();resolve(value);};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error);};});
}
