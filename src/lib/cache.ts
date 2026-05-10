// Cache persistente no servidor para evitar múltiplas chamadas ao banco no mesmo request

interface UserData {
  userName: string;
  userRole: string;
  storeName: string;
  tenantId: string;
}

declare global {
  var __userDataCache: Map<string, UserData> | undefined;
}

if (!global.__userDataCache) {
  global.__userDataCache = new Map();
}

const cacheStore = global.__userDataCache;

export function getCachedUserData(userId: string): UserData | null {
  const cacheKey = `user-data:${userId}`;
  return cacheStore.get(cacheKey) ?? null;
}

export function setCachedUserData(userId: string, data: UserData): void {
  const cacheKey = `user-data:${userId}`;
  cacheStore.set(cacheKey, data);
}

export function clearUserCache(userId?: string): void {
  if (userId) {
    cacheStore.delete(`user-data:${userId}`);
  } else {
    cacheStore.clear();
  }
}