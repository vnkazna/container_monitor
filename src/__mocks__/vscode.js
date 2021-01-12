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
      with: jest.fn(),
    }),
  },
};
