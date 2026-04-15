import { createStorage, StorageEnum } from '../base/index.js';
import type { XhsAuthorDataType, XhsAuthorStorageType } from '../base/index.js';

const storage = createStorage<XhsAuthorDataType[]>('xhs-author-storage-key', [], {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
  serialization: {
    serialize: (value: XhsAuthorDataType[]) => JSON.stringify(value),
    deserialize: (text: string) => {
      try {
        return JSON.parse(text) as XhsAuthorDataType[];
      } catch {
        return [];
      }
    },
  },
});

export const xhsAuthorStorage: XhsAuthorStorageType = {
  ...storage,
  addAuthor: async authorData => {
    await storage.set(currentAuthors => {
      const existingIndex = currentAuthors.findIndex(a => a.userId === authorData.userId);
      if (existingIndex !== -1) {
        // 同一作者：覆盖更新，保留原有 id 和 createdAt
        const updated = [...currentAuthors];
        updated[existingIndex] = { ...currentAuthors[existingIndex], ...authorData };
        return updated;
      }
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const createdAt = new Date().toISOString();
      return [...currentAuthors, { ...authorData, id, createdAt }];
    });
  },
  removeAuthor: async id => {
    await storage.set(currentAuthors => currentAuthors.filter(author => author.id !== id));
  },
  clearAll: async () => {
    await storage.set([]);
  },
};
