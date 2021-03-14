import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as samplePRs from './sample-responses/samplepr.json';
import { IBrowserProps, Browser } from '../components/browser/Browser';

// Unit tests for PullRequestTab
describe('Browser', () => {
  const DEFAULT_PROPS: IBrowserProps = {
    commands: {} as any,
    docRegistry: {} as any,
    prGroups: [
      { name: 'group1', pullRequests: (samplePRs as any).default },
      { name: 'group2', pullRequests: (samplePRs as any).default }
    ]
  };

  // Test render
  describe('#render()', () => {
    const component = shallow(<Browser {...DEFAULT_PROPS} />);
    it('should be a div', () => {
      expect(component.find('div')).toHaveLength(1);
      expect(component.find('.jp-PullRequestBrowser')).toHaveLength(1);
    });
    it('should have a list', () => {
      expect(component.find('ul')).toHaveLength(1);
    });
    it('should have two BrowserGroup', () => {
      expect(component.find('BrowserGroup')).toHaveLength(2);
    });
  });
});
