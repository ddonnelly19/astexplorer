import { connect } from 'react-redux';
import ASTOutput from '../components/ASTOutput';
import * as selectors from '../store/selectors';

export default connect( (state) => {
	return {
		parseResult: selectors.getParseResult(state),
		position: selectors.getCursor(state),
	};
})(ASTOutput);
