type RevisionLike = {
  getPath(): string;
};

type StorageBackend = {
  owns(revision: unknown): boolean;
  matchesURL(): boolean;
  fetchFromURL(): Promise<unknown>;
  create(data: unknown): Promise<unknown>;
  update(revision: unknown, data: unknown): Promise<unknown>;
  fork(revision: unknown, data: unknown): Promise<unknown>;
};

export default class StorageHandler {
  private _backends: StorageBackend[];

  constructor(backends: StorageBackend[]) {
    this._backends = backends;
  }

  _first(): StorageBackend {
    return this._backends[0];
  }

  _owns(revision: unknown): StorageBackend | null {
    for (const backend of this._backends) {
      if (backend.owns(revision)) {
        return backend;
      }
    }
    return null;
  }

  updateHash(revision: RevisionLike) {
    global.location.hash = revision.getPath();
  }

  fetchFromURL(): Promise<unknown> {
    if (/^#?\/?$/.test(global.location.hash)) {
      return Promise.resolve(null);
    }
    for (const backend of this._backends) {
      if (backend.matchesURL()) {
        return backend.fetchFromURL();
      }
    }
    return Promise.reject(new Error('Unknown URL format.'));
  }

  /**
   * Create a new snippet.
   */
  create(data: unknown): Promise<unknown> {
    return this._first().create(data);
  }

  /**
   * Update an existing snippet.
   */
  update(revision: unknown, data: unknown): Promise<unknown> {
    return this._first().update(revision, data);
  }

  /**
   * Fork existing snippet.
   */
  fork(revision: unknown, data: unknown): Promise<unknown> {
    return this._first().fork(revision, data);
  }
}
