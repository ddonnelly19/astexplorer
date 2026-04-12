import isEqual from 'lodash.isequal';
import {getParserByID, getTransformerByID} from '../parsers';

type State = any;

type Selector<T = any> = (state: State) => T;

// Our selectors are not computationally expensive so we can just use this
// implementation.
function createSelector<T>(deps: Selector[], f: (...args: any[]) => T): Selector<T> {
  return function(state: State): T {
    return f.apply(this, deps.map(d => d(state)));
  }
}

// UI related

export function getFormattingState(state: State) {
  return state.enableFormatting;
}

export function getCursor(state: State) {
  return state.cursor;
}

export function getError(state: State) {
  return state.error;
}

export function isLoadingSnippet(state: State) {
  return state.loadingSnippet;
}

export function showSettingsDialog(state: State) {
  return state.showSettingsDialog;
}

export function showSettingsDrawer(state: State) {
  return state.showSettingsDrawer;
}

export function showShareDialog(state: State) {
  return state.showShareDialog;
}

export function isForking(state: State) {
  return state.forking;
}

export function isSaving(state: State) {
  return state.saving;
}

// Parser related

export function getParser(state: State) {
  return getParserByID(state.workbench.parser);
}

export function getParserSettings(state: State) {
  return state.workbench.parserSettings;
}

export function getParseResult(state: State) {
  return state.workbench.parseResult;
}

// Code related
export function getRevision(state: State) {
  return state.activeRevision;
}

export function getCode(state: State) {
  return state.workbench.code;
}

export function getInitialCode(state: State) {
  return state.workbench.initialCode;
}

export function getKeyMap (state: State) {
  return state.workbench.keyMap;
}


const isCodeDirty = createSelector(
  [getCode, getInitialCode],
  (code, initialCode) => code !== initialCode,
);

// Transform related

export function getTransformCode(state: State) {
  return state.workbench.transform.code;
}

export function getInitialTransformCode(state: State) {
  return state.workbench.transform.initialCode;
}

export function getTransformer(state: State) {
  return getTransformerByID(state.workbench.transform.transformer);
}

export function getTransformResult(state: State) {
  return state.workbench.transform.transformResult;
}

export function showTransformer(state: State) {
  return state.showTransformPanel;
}

const isTransformDirty = createSelector(
  [getTransformCode, getInitialTransformCode],
  (code, initialCode) => code !== initialCode,
);

export const canFork = createSelector(
  [getRevision],
  (revision) => !!revision,
);

const canSaveCode = createSelector(
  [getRevision, isCodeDirty],
  (revision, dirty) => (
    !revision || // can always save if there is no revision
    dirty
  ),
);

export const canSaveTransform = createSelector(
  [showTransformer, isTransformDirty],
  (showTransformer, dirty) => showTransformer && dirty,
);

const didParserSettingsChange = createSelector(
  [getParserSettings, getRevision, getParser],
  (parserSettings, revision, parser) => {
    const savedParserSettings = revision && revision.getParserSettings();
    return (
      !!revision &&
      (
        parser.id !== revision.getParserID() ||
        !!savedParserSettings && !isEqual(parserSettings, savedParserSettings)
      )
    )

  },
);

export const canSave = createSelector(
  [getRevision, canSaveCode, canSaveTransform, didParserSettingsChange],
  (revision, canSaveCode, canSaveTransform, didParserSettingsChange) => (
    (canSaveCode || canSaveTransform || didParserSettingsChange) &&
    (!revision || revision.canSave())
  ),
);
