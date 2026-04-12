import * as LocalStorage from './components/LocalStorage';
import ASTOutputContainer from './containers/ASTOutputContainer';
import CodeEditorContainer from './containers/CodeEditorContainer';
import ErrorMessageContainer from './containers/ErrorMessageContainer';
import GistBanner from './components/GistBanner';
import LoadingIndicatorContainer from './containers/LoadingIndicatorContainer';
import PasteDropTargetContainer from './containers/PasteDropTargetContainer';
import { publish } from './utils/pubsub';
import * as React from 'react';
import SettingsDialogContainer from './containers/SettingsDialogContainer';
import ShareDialogContainer from './containers/ShareDialogContainer';
import SplitPane from './components/SplitPane';
import ToolbarContainer from './containers/ToolbarContainer';
import TransformerContainer from './containers/TransformerContainer';
import debounce from './utils/debounce';
import { Provider, connect } from 'react-redux';
import { astexplorer, persist, revive } from './store/reducers';
import { configureStore } from '@reduxjs/toolkit';
import { canSaveTransform, getRevision } from './store/selectors';
import { loadSnippet } from './store/actions';
import { createRoot } from 'react-dom/client';
import * as gist from './storage/gist';
import * as parse from './storage/parse';
import StorageHandler from './storage';
import '../css/style.css';
import parserMiddleware from './store/parserMiddleware';
import snippetMiddleware from './store/snippetMiddleware';
import transformerMiddleware from './store/transformerMiddleware';
import cx from './utils/classnames';
import { setupMonacoEnvironment } from './utils/setupMonaco';
import PropTypes from 'prop-types';

// Setup Monaco Editor environment before any monaco components load
setupMonacoEnvironment();

function resize() {
	publish('PANEL_RESIZE');
}

function App({ showTransformer, hasError }) {
	return (
		<>
			<ErrorMessageContainer />
			<PasteDropTargetContainer id="main" className={cx({ hasError })}>
				<LoadingIndicatorContainer />
				<SettingsDialogContainer />
				<ShareDialogContainer />
				<ToolbarContainer />
				<GistBanner />
				<SplitPane
					className="splitpane-content"
					vertical={true}
					onResize={resize}>
					<SplitPane
						className="splitpane"
						onResize={resize}
						vertical={undefined}>
						<CodeEditorContainer />
						<ASTOutputContainer />
					</SplitPane>
					{showTransformer ? <TransformerContainer /> : null}
				</SplitPane>
			</PasteDropTargetContainer>
		</>
	);
}

App.propTypes = {
	hasError: PropTypes.bool,
	showTransformer: PropTypes.bool,
};

const AppContainer = connect(
	/** @param {ReturnType<typeof astexplorer>} state */
	(state) => ({
		showTransformer: state.showTransformPanel,
		hasError: !!state.error,
	}),
)(App);

const storageAdapter = new StorageHandler([gist, parse]);
const store = configureStore({
	reducer: astexplorer,
	preloadedState: revive(LocalStorage.readState()),
	middleware: getDefaultMiddleware =>
		getDefaultMiddleware({ serializableCheck: false, immutabilityCheck: false }).concat(
			snippetMiddleware(storageAdapter),
			parserMiddleware,
			transformerMiddleware,
		),
});
store.subscribe(debounce(() => {
	const state = store.getState();
	// We are not persisting the state while looking at an existing revision
	if (!getRevision(state)) {
		LocalStorage.writeState(persist(state));
	}
}));
store.dispatch({ type: 'INIT' });

// @ts-ignore
const root = createRoot(document.getElementById('container'));
root.render(
	<Provider store={store}>
		<AppContainer />
	</Provider>
);

global.onhashchange = () => {
	store.dispatch(loadSnippet());
};

if (location.hash.length > 1) {
	store.dispatch(loadSnippet());
}

global.onbeforeunload = () => {
	const state = store.getState();
	if (canSaveTransform(state)) {
		return 'You have unsaved transform code. Do you really want to leave?';
	}
};
