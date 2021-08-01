const { Uri } = require('../test_utils/uri');
const { EventEmitter } = require('../test_utils/event_emitter');
const { FileType } = require('../test_utils/file_type');
const { FileSystemError } = require('../test_utils/file_system_error');

module.exports = {
  TreeItem: function TreeItem(labelOrUri, collapsibleState) {
    return typeof labelOrUri === 'string'
      ? { label: labelOrUri, collapsibleState }
      : { resourceUri: labelOrUri, collapsibleState };
  },
  ThemeIcon: function ThemeIcon(id) {
    return { id };
  },
  EventEmitter,
  TreeItemCollapsibleState: {
    Collapsed: 'collapsed',
  },
  Uri,
  comments: {
    createCommentController: jest.fn(),
  },
  window: {
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    createStatusBarItem: jest.fn(),
    showInputBox: jest.fn(),
    showQuickPick: jest.fn(),
    withProgress: jest.fn(),
    createQuickPick: jest.fn(),
  },
  commands: {
    executeCommand: jest.fn(),
    registerCommand: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn().mockReturnValue({}),
  },
  extensions: {
    getExtension: jest.fn(),
  },
  CommentMode: { Editing: 0, Preview: 1 },
  StatusBarAlignment: { Left: 0 },
  CommentThreadCollapsibleState: { Collapsed: 0, Expanded: 1 },
  Position: function Position(line, character) {
    return { line, character };
  },
  Range: function Range(start, end) {
    return { start, end };
  },
  CancellationTokenSource: jest.fn(),
  ThemeColor: jest.fn(color => color),
  ProgressLocation: {
    Notification: 'Notification',
  },
  FileType,
  FileSystemError,
};
