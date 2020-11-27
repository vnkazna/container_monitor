jest.mock('./custom_query_item');

const vscode = require('vscode');

const { MultirootCustomQueryItem } = require('./multiroot_custom_query_item');
const { CustomQueryItem } = require('./custom_query_item');

describe('MultirootCustomQueryItem', () => {
  const customQuery = { name: 'Query name' };

  let item;

  beforeEach(() => {
    const projects = ['a', 'b'];
    item = new MultirootCustomQueryItem(customQuery, projects);
  });

  it('should use query name to create collapsed item', () => {
    expect(vscode.TreeItem).toBeCalledWith('Query name', vscode.TreeItemCollapsibleState.Collapsed);
  });

  it('should return custom query children', async () => {
    CustomQueryItem.mockImplementation((query, project, showProject) => ({
      query,
      project,
      showProject,
    }));
    const [a, b] = await item.getChildren();
    expect(a).toEqual({ query: customQuery, project: 'a', showProject: true });
    expect(b).toEqual({ query: customQuery, project: 'b', showProject: true });
  });
});
