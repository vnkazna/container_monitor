import { mount } from '@vue/test-utils';
import IssuableDiscussions from './IssuableDiscussions';

const discussionsResponse = require('../../../../test/integration/fixtures/graphql/discussions.json');

describe('IssuableDiscussions', () => {
  beforeEach(() => {
    window.vsCodeApi = { postMessage: jest.fn() };
  });
  it('renders', () => {
    const wrapper = mount(IssuableDiscussions, {
      propsData: {
        discussions: discussionsResponse.project.issue.discussions.nodes,
      },
      stubs: {
        date: true,
      },
    });
    expect(wrapper.element).toMatchSnapshot();
  });
});
