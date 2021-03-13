import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import {
  BrowserGroup,
  IBrowserGroupProps
} from '../components/browser/BrowserGroup';
import { PullRequestItem } from '../components/browser/PullRequestItem';
import * as samplePRs from './sample-responses/samplepr.json';

// Unit tests for BrowserGroup
describe('BrowserGroup', () => {
  const DEFAULT_PROPS: IBrowserGroupProps = {
    commands: {} as any,
    docRegistry: {} as any,
    group: { name: 'group1', pullRequests: (samplePRs as any).default }
  };

  // Test render
  describe('#render()', () => {
    it('should be a list item', () => {
      const component = shallow(<BrowserGroup {...DEFAULT_PROPS} />);
      expect(component.find('li')).toHaveLength(1);
      expect(component.find('.jp-PullRequestBrowserGroup')).toHaveLength(1);
    });

    it('should have a header with text props.header', () => {
      const component = shallow(<BrowserGroup {...DEFAULT_PROPS} />);
      expect(component.find('header h2')).toHaveLength(1);
      expect(
        component.contains([<h2 key={1}>{DEFAULT_PROPS.group.name}</h2>])
      ).toEqual(true);
    });

    it('should load group', () => {
      const component = shallow(<BrowserGroup {...DEFAULT_PROPS} />);

      expect(component.find('.jp-PullRequestBrowserGroupError')).toHaveLength(
        0
      );
      expect(component.find('ul')).toHaveLength(1);
      expect(component.find('.jp-PullRequestBrowserGroupList')).toHaveLength(1);
    });

    it('should load list item prs', () => {
      const component = shallow(<BrowserGroup {...DEFAULT_PROPS} />);
      expect(component.find(PullRequestItem)).toHaveLength(1);
    });

    it('should not have a group if there is an error', () => {
      const component = shallow(
        <BrowserGroup
          {...DEFAULT_PROPS}
          group={{
            name: 'error',
            pullRequests: [],
            error: 'There is an error'
          }}
        />
      );
      expect(component.find('ul')).toHaveLength(0);
      expect(component.find('.jp-PullRequestBrowserGroupList')).toHaveLength(0);
    });

    it('should display error if one exists', () => {
      const error = 'There is an error';
      const component = shallow(
        <BrowserGroup
          {...DEFAULT_PROPS}
          group={{
            name: 'error',
            pullRequests: [],
            error
          }}
        />
      );

      expect(component.find('.jp-PullRequestBrowserGroupError')).toHaveLength(
        1
      );
      expect(component.contains(error)).toEqual(true);
    });
  });
});
