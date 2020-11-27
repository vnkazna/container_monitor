const vscode = require('vscode');

const { CustomQueryItem } = require('./custom_query_item');

describe('CustomQueryItem', () => {
  const customQuery = { name: 'Query name' };
  const project = { label: 'Project label' };
  // eslint-disable-next-line no-unused-vars
  let item;

  describe('item labeled as a query', () => {
    beforeEach(() => {
      item = new CustomQueryItem(customQuery, project);
    });

    it('should have query name as label', () => {
      expect(vscode.TreeItem).toBeCalledWith(
        'Query name',
        vscode.TreeItemCollapsibleState.Collapsed,
      );
    });

    it('should have filter icon', () => {
      expect(vscode.ThemeIcon).toHaveBeenCalledWith('filter');
    });
  });

  describe('item labeled as a project', () => {
    beforeEach(() => {
      item = new CustomQueryItem(customQuery, project, true);
    });

    it('should have project label as label', () => {
      expect(vscode.TreeItem).toBeCalledWith(
        'Project label',
        vscode.TreeItemCollapsibleState.Collapsed,
      );
    });

    it('should have project icon', () => {
      expect(vscode.ThemeIcon).toHaveBeenCalledWith('project');
    });
  });
});
