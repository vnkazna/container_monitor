module.exports = {
  TreeItem: function TreeItem(label, collapsibleState) {
    return { label, collapsibleState };
  },
  ThemeIcon: function ThemeIcon(id) {
    return { id };
  },
  EventEmitter: jest.fn(),
  TreeItemCollapsibleState: {
    Collapsed: 'collapsed',
  },
  Uri: {
    file: path => ({
      path,
      with: args => ({
        path,
        ...args,
      }),
    }),
    parse: str => str,
  },
  comments: {
    createCommentController: jest.fn(),
  },
  window: {
    showErrorMessage: jest.fn(),
  },
  commands: {
    executeCommand: jest.fn(),
  },
  CommentMode: { Preview: 1 },
  CommentThreadCollapsibleState: { Expanded: 1 },
  Position: function Position(x, y) {
    return { x, y };
  },
  Range: function Range(start, end) {
    return { start, end };
  },
};
