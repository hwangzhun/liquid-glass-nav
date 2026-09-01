const databaseName = "tidal-import-jobs";
const storeName = "jobs";
const activeJobKey = "active";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readImportJob<T>(): Promise<T | null> {
  if (typeof indexedDB === "undefined") return null;
  const database = await openDatabase();
  return new Promise<T | null>((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).get(activeJobKey);
    request.onsuccess = () => resolve((request.result as T | undefined) || null);
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

export async function writeImportJob(value: unknown) {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(storeName, "readwrite").objectStore(storeName).put(value, activeJobKey);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}

export async function clearImportJob() {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(storeName, "readwrite").objectStore(storeName).delete(activeJobKey);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}
