import * as selectors from './selectors';
import * as actions from './actions';

type Store = { getState: () => any };
type Next = (action: any) => any;
type StorageAdapter = {
  fetchFromURL(): Promise<any>;
  fork(revision: any, data: any): Promise<any>;
  update(revision: any, data: any): Promise<any>;
  create(data: any): Promise<any>;
  updateHash(revision: any): void;
};

let clearURLOnClearError = false;
let cancelLoad = () => {};

export default (storageAdapter: StorageAdapter) => (store: Store) => (next: Next) => (action: any) => {
  switch (action.type) {
    case actions.CLEAR_ERROR:
      // If CLEAR_ERROR action happens after a URL was loaded, clear the URL
      if (clearURLOnClearError) {
        clearURLOnClearError = false;
        global.location.hash = '';
      }
      return next(action);
    case actions.LOAD_SNIPPET:
      return loadSnippet(store.getState(), next, storageAdapter);
    case actions.SAVE:
      next(actions.startSave(action.fork));
      saveSnippet(action, store.getState(), next, storageAdapter)
        .then(() => next(actions.endSave(action.fork)));
      break;
    default:
      // Pass on
      return next(action);
  }
};

async function loadSnippet(state: any, next: Next, storageAdapter: StorageAdapter) {
  // Ignore changes to the URL while a snippet is being saved (that process will
  // update the URL.
  if (selectors.isSaving(state) || selectors.isForking(state)) {
    return;
  }

  // Cancel any previous snippet loader (see below)
  cancelLoad();
  // Do not clear URL anymore, we are loading a new one
  clearURLOnClearError = false;

  next(actions.setError(null));
  next(actions.startLoadingSnippet());

  try {
    let cancelled = false;
    cancelLoad = () => cancelled = true;
    const revision = await storageAdapter.fetchFromURL();
    // revision can be null if the URL is "empty"
    if (!cancelled) {
      if (revision) {
        next(actions.setSnippet(revision));
      } else {
        next(actions.clearSnippet());
      }
    }
  } catch(error: any) {
    const errorMessage = 'Failed to fetch revision: ' + error.message;

    clearURLOnClearError = true;
    next(actions.setError(new Error(errorMessage)));
  } finally {
    next(actions.doneLoadingSnippet());
  }
}

async function saveSnippet({fork}: {fork: boolean}, state: any, next: Next, storageAdapter: StorageAdapter) {
  const revision = selectors.getRevision(state);
  const parser = selectors.getParser(state);
  const parserSettings = selectors.getParserSettings(state);
  const code = selectors.getCode(state);
  const transformCode = selectors.getTransformCode(state);
  const transformer = selectors.getTransformer(state);
  const showTransformPanel = selectors.showTransformer(state);

  const data = {
    parserID: parser.id,
    settings: {
      [parser.id]: parserSettings,
    },
    versions: {
      [parser.id]: parser.version,
    },
    filename: `source.${parser.category.fileExtension}`,
    code,
  } as any;
  if (showTransformPanel && transformer) {
    data.toolID = transformer.id;
    data.versions[transformer.id] = transformer.version;
    data.transform = transformCode;
  }


  try {
    let newRevision;
    if (fork) {
      newRevision = await storageAdapter.fork(revision, data);
    } else if (revision) {
      newRevision = await storageAdapter.update(revision, data);
    } else {
      newRevision = await storageAdapter.create(data);
    }
    if (newRevision) {
      storageAdapter.updateHash(newRevision);
    }
  } catch (error) {
    next(actions.setError(error));
  }
}
