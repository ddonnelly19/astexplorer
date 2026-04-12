import {initVimMode} from 'monaco-vim';
import PropTypes from 'prop-types';
import {subscribe, clear} from '../utils/pubsub';
import React from 'react';
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution';
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution';
import 'monaco-editor/esm/vs/basic-languages/php/php.contribution';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

const defaultPrettierOptions = {
  printWidth: 80,
  tabWidth: 2,
  singleQuote: false,
  trailingComma: /** @type {const} */ ('none'),
  bracketSpacing: true,
  jsxBracketSameLine: false,
  parser: 'babel',
};

export default class Editor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      value: props.value,
    };
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.state.value) {
      this.setState(
        {value: nextProps.value},
        () => this._setValue(nextProps.value),
      );
    }
    if (nextProps.mode !== this.props.mode) {
      this._setMode(nextProps.mode);
    }

    if (nextProps.keyMap !== this.props.keyMap) {
      this._setKeyMap(nextProps.keyMap);
    }

    this._setError(nextProps.error);
  }


  shouldComponentUpdate() {
    return false;
  }

  getValue() {
    return this.editor && this.editor.getValue();
  }

  _getEditorModel() {
    return this.editor && this.editor.getModel();
  }

  _normalizeMode(mode) {
    if (mode && typeof mode === 'object') {
      if (mode.json) {
        return 'json';
      }
      mode = mode.name;
    }

    switch (mode) {
      case 'javascript':
      case 'js':
        return 'javascript';
      case 'json':
      case 'application/json':
        return 'json';
      case 'htmlmixed':
      case 'html':
      case 'text/html':
        return 'html';
      case 'css':
      case 'text/css':
        return 'css';
      case 'markdown':
      case 'text/markdown':
      case 'md':
        return 'markdown';
      case 'python':
        return 'python';
      case 'php':
      case 'application/php':
        return 'php';
      case 'sql':
      case 'text/x-sql':
        return 'sql';
      case 'xml':
      case 'text/xml':
      case 'application/xml':
      case 'text/x-webidl':
        return 'xml';
      default:
        return 'plaintext';
    }
  }

  _setMode(mode) {
    const model = this._getEditorModel();
    if (model) {
      monaco.editor.setModelLanguage(model, this._normalizeMode(mode));
    }
  }

  _setKeyMap(_keyMap) {
    if (!this.editor) {
      return;
    }

    if (this._vimMode) {
      this._vimMode.dispose();
      this._vimMode = null;
    }

    if (this.vimStatus) {
      this.vimStatus.textContent = '';
      this.vimStatus.style.display = _keyMap === 'vim' ? 'block' : 'none';
    }

    if (_keyMap === 'vim') {
      this._vimMode = initVimMode(this.editor, this.vimStatus || null);
    }
  }

  _getErrorLine(error) {
    return error.loc ? error.loc.line : (error.lineNumber || error.line);
  }

  _setError(error) {
    const model = this._getEditorModel();
    if (!model || !this.editor) {
      return;
    }

    const decorations = [];
    if (error) {
      const lineNumber = this._getErrorLine(error);
      if (lineNumber) {
        decorations.push({
          range: new monaco.Range(lineNumber, 1, lineNumber, 1),
          options: {
            isWholeLine: true,
            className: 'errorMarker',
          },
        });
      }
    }

    this._errorDecorations = this.editor.deltaDecorations(
      this._errorDecorations || [],
      decorations,
    );
  }

  _posFromIndex(index) {
    if (this.props.posFromIndex) {
      return this.props.posFromIndex(index);
    }

    const model = this._getEditorModel();
    if (!model) {
      return null;
    }

    const position = model.getPositionAt(index);
    return {
      line: position.lineNumber - 1,
      ch: position.column - 1,
    };
  }

  _monacoPositionFromIndex(index) {
    const position = this._posFromIndex(index);
    if (!position) {
      return null;
    }
    return {
      lineNumber: position.line + 1,
      column: position.ch + 1,
    };
  }

  _getPrintWidth() {
    if (!this.editor) {
      return defaultPrettierOptions.printWidth;
    }

    const layout = this.editor.getLayoutInfo();
    const fontInfo = this.editor.getOption(monaco.editor.EditorOption.fontInfo);
    const characterWidth = fontInfo.typicalHalfwidthCharacterWidth || 8;
    return Math.max(40, Math.floor(layout.contentWidth / characterWidth));
  }

  _setValue(value) {
    if (!this.editor) {
      return;
    }

    const model = this._getEditorModel();
    if (!model || model.getValue() === value) {
      return;
    }

    const editor = this.editor;
    const position = editor.getPosition();
    const scrollTop = editor.getScrollTop();
    const scrollLeft = editor.getScrollLeft();

    this._suppressChangeEvent = true;
    model.setValue(value);
    this._suppressChangeEvent = false;

    if (position) {
      editor.setPosition(position);
    }
    editor.setScrollTop(scrollTop);
    editor.setScrollLeft(scrollLeft);
  }

  componentDidMount() {
    if (!this.container) {
      return;
    }

    this._subscriptions = [];
    this._disposables = [];
    this.editor = monaco.editor.create(this.container, {
      value: this.state.value,
      language: this._normalizeMode(this.props.mode),
      lineNumbers: this.props.lineNumbers ? 'on' : 'off',
      readOnly: this.props.readOnly,
      minimap: {enabled: false},
      scrollBeyondLastLine: false,
      automaticLayout: false,
      wordWrap: 'off',
      glyphMargin: false,
      folding: false,
      renderLineHighlight: 'none',
      theme: 'vs',
    });

    this._setKeyMap(this.props.keyMap);

    this._disposables.push(this.editor.onDidBlurEditorText(() => {
      if (!this.props.enableFormatting) return;

      Promise.all([
        import('prettier/standalone'),
        import('prettier/parser-babel'),
      ]).then(([prettierModule, babelModule]) => {
        if (!this.editor) {
          return;
        }
        const prettier = prettierModule.default || prettierModule;
        const babel = babelModule.default || babelModule;
        const currValue = this.editor.getValue();
        const options = Object.assign({},
          defaultPrettierOptions,
          {
            printWidth: this._getPrintWidth(),
            plugins: [babel],
          });
        this._setValue(prettier.format(currValue, options));
      });
    }));

    this._disposables.push(this.editor.onDidChangeModelContent(() => {
      if (this._suppressChangeEvent) {
        return;
      }
      clearTimeout(this._updateTimer);
      this._updateTimer = setTimeout(this._onContentChange.bind(this), 200);
    }));
    this._disposables.push(this.editor.onDidChangeCursorPosition(() => {
      clearTimeout(this._updateTimer);
      this._updateTimer = setTimeout(this._onActivity.bind(this), 100);
    }));

    this._subscriptions.push(
      subscribe('PANEL_RESIZE', () => {
        if (this.editor) {
          this.editor.layout();
        }
      }),
    );

    if (this.props.highlight) {
      this._markerRange = null;
      this._mark = null;
      this._subscriptions.push(
        subscribe('HIGHLIGHT', data => {
          const range = data && Array.isArray(data['range']) ? data['range'] : null;
          if (!range || !this.editor) {
            return;
          }
          this._markerRange = range;
          let [start, end] = range.map(index => this._monacoPositionFromIndex(index));
          if (!start || !end) {
            this._markerRange = this._mark = null;
            return;
          }
          this._mark = this.editor.deltaDecorations(this._mark || [], [{
            range: new monaco.Range(
              start.lineNumber,
              start.column,
              end.lineNumber,
              end.column,
            ),
            options: {inlineClassName: 'marked'},
          }]);
        }),

        subscribe('CLEAR_HIGHLIGHT', data => {
          const range = data && Array.isArray(data['range']) ? data['range'] : null;
          if (!range ||
            this._markerRange &&
            range[0] === this._markerRange[0] &&
            range[1] === this._markerRange[1]
          ) {
            this._markerRange = null;
            if (this._mark) {
              const editor = this.editor;
              if (editor) {
                this._mark = editor.deltaDecorations(this._mark, []);
              }
              this._mark = null;
            }
          }
        }),
      );
    }

    if (this.props.error) {
      this._setError(this.props.error);
    }
  }

  componentWillUnmount() {
    clearTimeout(this._updateTimer);
    this._unbindHandlers();
    this._markerRange = null;
    this._mark = null;
    this._errorDecorations = [];
    if (this.editor) {
      if (this._vimMode) {
        this._vimMode.dispose();
        this._vimMode = null;
      }
      const model = this.editor.getModel();
      this.editor.dispose();
      if (model) {
        model.dispose();
      }
      this.editor = null;
    }
  }

  _unbindHandlers() {
    if (this._disposables) {
      this._disposables.forEach(disposable => disposable.dispose());
    }
    clear(this._subscriptions || []);
  }

  _onContentChange() {
    const model = this._getEditorModel();
    if (!model) {
      return;
    }
    const editor = this.editor;
    if (!editor) {
      return;
    }
    const position = editor.getPosition();
    const args = {
      value: model.getValue(),
      cursor: position ? model.getOffsetAt(position) : 0,
    };
    this.setState(
      {value: args.value},
      () => this.props.onContentChange(args),
    );
  }

  _onActivity() {
    const model = this._getEditorModel();
    const position = this.editor && this.editor.getPosition();
    if (!model || !position) {
      return;
    }
    this.props.onActivity(
      model.getOffsetAt(position),
    );
  }

  render() {
    return (
      <div className="editorShell">
        <div className="editor" ref={c => { this.container = c; }}/>
        <div
          className="editorVimStatus"
          ref={c => { this.vimStatus = c; }}
          style={{display: this.props.keyMap === 'vim' ? 'block' : 'none'}}
        />
      </div>
    );
  }
}

Editor.propTypes = {
  value: PropTypes.string,
  highlight: PropTypes.bool,
  lineNumbers: PropTypes.bool,
  readOnly: PropTypes.bool,
  onContentChange: PropTypes.func,
  onActivity: PropTypes.func,
  posFromIndex: PropTypes.func,
  error: PropTypes.object,
  mode: PropTypes.string,
  enableFormatting: PropTypes.bool,
  keyMap: PropTypes.string,
};

Editor.defaultProps = {
  value: '',
  highlight: true,
  lineNumbers: true,
  readOnly: false,
  mode: 'javascript',
  keyMap: 'default',
  onContentChange: () => {},
  onActivity: () => {},
};
