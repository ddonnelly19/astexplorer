import { connect } from 'react-redux';
import { setCode, setCursor } from '../store/actions';
import Editor from '../components/Editor';
import { getCode, getParser, getParseResult, getKeyMap } from '../store/selectors';

export default connect(
	(state) => {
		return {
			keyMap: getKeyMap(state),
			value: getCode(state),
			mode: getParser(state).category.editorMode || getParser(state).category.id,
			error: (getParseResult(state) || {}).error,
		};
	},
	(dispatch) => {
		return {
			onContentChange: ({ value, cursor }) => {
				dispatch(setCode({ code: value, cursor }));
			},
			onActivity: cursor => dispatch(setCursor(cursor)),
		};
	}
)(Editor);
