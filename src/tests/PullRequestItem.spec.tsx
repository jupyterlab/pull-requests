import { shallow } from 'enzyme';
import 'jest';
import React from 'react';
import { BeatLoader } from 'react-spinners';
import {
  IPullRequestItemProps,
  PullRequestItem
} from '../components/browser/PullRequestItem';
import * as samplePRs from './sample-responses/samplepr.json';
import * as sampleFiles from './sample-responses/samplefile.json';

// Unit tests for PullRequestItem
describe('PullRequestItem', () => {
  const DEFAULT_PROPS: IPullRequestItemProps = {
    commands: {} as any,
    docRegistry: {} as any,
    pullRequest: (samplePRs as any).default[0]
  };

  // Cache original functionality
  const realUseState = React.useState;

  // Test render
  describe('#render()', () => {
    it('should be a list item', () => {
      const component = shallow(<PullRequestItem {...DEFAULT_PROPS} />);
      expect(component.find('li')).toHaveLength(1);
      expect(component.find(BeatLoader)).toHaveLength(0);
    });

    it('should have a header with the PR title', () => {
      const component = shallow(<PullRequestItem {...DEFAULT_PROPS} />);
      expect(component.find('h2')).toHaveLength(1);
      expect(
        component.contains(<h2>{DEFAULT_PROPS.pullRequest.title}</h2>)
      ).toEqual(true);
    });

    it('should display the loader when it is loading', () => {
      const mockedUseState = jest.spyOn(React, 'useState') as any;
      // Non default state value in order of useState calls
      const state = [undefined, undefined, true, undefined];
      mockedUseState.mockImplementation((init: any) => {
        const newInit = state.shift();
        return realUseState(newInit === undefined ? init : newInit);
      });

      const component = shallow(<PullRequestItem {...DEFAULT_PROPS} />);
      expect(component.find(BeatLoader)).toHaveLength(1);
    });

    it('should not display error nor files if not expanded', () => {
      const component = shallow(<PullRequestItem {...DEFAULT_PROPS} />);
      expect(component.find('.jp-PullRequestBrowserGroupError')).toHaveLength(
        0
      );
      expect(component.find('ul')).toHaveLength(0);
    });

    it('should display error if expanded and error', () => {
      const error = 'This is an error message.';
      const mockedUseState = jest.spyOn(React, 'useState') as any;
      // Non default state value in order of useState calls
      const state = [undefined, true, undefined, error];
      mockedUseState.mockImplementation((init: any) => {
        const newInit = state.shift();
        return realUseState(newInit === undefined ? init : newInit);
      });

      const component = shallow(<PullRequestItem {...DEFAULT_PROPS} />);
      expect(component.find('.jp-PullRequestBrowserGroupError')).toHaveLength(
        1
      );
      expect(component.contains(error)).toEqual(true);
      expect(component.find('ul')).toHaveLength(0);
    });

    it('should display file list if expanded and no error', () => {
      const mockedUseState = jest.spyOn(React, 'useState') as any;
      // Non default state value in order of useState calls
      const state = [(sampleFiles as any).default, true, undefined, undefined];
      mockedUseState.mockImplementation((init: any) => {
        const newInit = state.shift();
        return realUseState(newInit === undefined ? init : newInit);
      });

      const component = shallow(<PullRequestItem {...DEFAULT_PROPS} />);
      expect(component.find('.jp-PullRequestBrowserGroupError')).toHaveLength(
        0
      );
      const fileList = component.find('ul');
      expect(fileList).toHaveLength(1);
      expect(fileList.first().find('li')).toHaveLength(1);
    });
  });
});
