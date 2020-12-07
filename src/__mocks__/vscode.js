module.exports = {
  TreeItem: jest.fn(),
  ThemeIcon: jest.fn(),
  EventEmitter: jest.fn(),
  TreeItemCollapsibleState: {
    Collapsed: 'collapsed',
  },
  Uri: {
    file: path => ({
      path,
      with: jest.fn(),
    }),
  },
};
