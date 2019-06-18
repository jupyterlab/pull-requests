import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import { IPullRequestBrowserItemProps, PullRequestBrowserItem } from '../../components/browser/PullRequestBrowserItem';
import { PullRequestItemFile } from '../../utils';
import { SAMPLE_PR_JSON, SAMPLE_FILE_JSON } from '../testutils';

// Unit tests for PullRequestBrowserItem
describe('PullRequestBrowserItem', () => {
    
    let props: IPullRequestBrowserItemProps = {
        header: 'Created by Me',
        filter: 'created',
        showTab: async (data: PullRequestItemFile) => {
            console.log('Show tab test.')
        }
    };

    // Test constructor
    describe('#constructor()', () => {
        const pullRequestBrowser = new PullRequestBrowserItem(props);
        it('should construct a new branch header', () => {
            expect(pullRequestBrowser).toBeInstanceOf(PullRequestBrowserItem);
        });
    });

    // Test render
    describe('#render()', () => {
        const component = shallow(<PullRequestBrowserItem {...props} />);
        it('should be a list', () => {
            expect(component.find('li')).toHaveLength(1);
            expect(component.find('.jp-PullRequestBrowserItem')).toHaveLength(1);
        });
        it('should have a header with text props.header', () => {
            expect(component.find('header h2')).toHaveLength(1);
            expect(component.contains([<h2>{props.header}</h2>])).toEqual(true);
        });
        it('should not load list item if failed api request', () => {
            component.setState({data: [], isLoading: false, error: null});
            expect(component.find('.jp-PullRequestBrowserItemListItem')).toHaveLength(0);
        });
        it('should not load list item if empty api response', () => {
            component.setState({data: [], isLoading: false, error: null});
            expect(component.find('.jp-PullRequestBrowserItemListItem')).toHaveLength(0);
        });
        it('should load list item if nonempty api response', () => {
            component.setState({data: JSON.parse(SAMPLE_PR_JSON)});
            expect(component.find('.jp-PullRequestBrowserItemListItem')).toHaveLength(1);
        })
        it('should load list item files if nonempty api response and expanded', () => {
            let _data = JSON.parse(SAMPLE_PR_JSON);
            _data[0].isExpanded = true;
            _data[0].files = [];
            _data[0].files.push(new PullRequestItemFile(JSON.stringify(JSON.parse(SAMPLE_FILE_JSON)[0]), _data[0]));
            component.setState({data:_data})
            expect(component.find('.jp-PullRequestBrowserItemFileList')).toHaveLength(1);
            expect(component.find('.jp-PullRequestBrowserItemFileItem')).toHaveLength(1);
        })
        it('should not load list item files if nonempty api response and unexpanded', () => {
            let _data = JSON.parse(SAMPLE_PR_JSON);
            _data[0].isExpanded = false;
            component.setState({data:_data})
            expect(component.find('.jp-PullRequestBrowserItemFileList')).toHaveLength(0);
        })
        it('should have a sublist if there is not an error', () => {
            component.setState({data: [], isLoading: false, error: null});
            expect(component.find('ul')).toHaveLength(1);
            expect(component.find('.jp-PullRequestBrowserItemList')).toHaveLength(1);
        });
        it('should not have a sublist if there is an error', () => {
            component.setState({data: [], isLoading: false, error: "error"});
            expect(component.find('ul')).toHaveLength(0);
            expect(component.find('.jp-PullRequestBrowserItemList')).toHaveLength(0);
        });
        it('should display error if one exists', () => {
            component.setState({data: [], isLoading: false, error: "error"});
            expect(component.find('.jp-PullRequestBrowserItemError')).toHaveLength(1);
            expect(component.contains([
                <h2 className="jp-PullRequestBrowserItemError">
                    <span style={{color: 'var(--jp-ui-font-color1)'}}>
                    Error Listing Pull Requests:
                    </span> error
                </h2>
            ])).toEqual(true);
        });
        it('should not display error if one does not exist', () => {
            component.setState({data: [], isLoading: false, error: null});
            expect(component.find('.jp-PullRequestBrowserItemError')).toHaveLength(0);
            expect(component.contains([
                <h2 className="jp-PullRequestBrowserItemError">
                    <span style={{color: 'var(--jp-ui-font-color1)'}}>
                    Error Listing Pull Requests:
                    </span> error
                </h2>
            ])).toEqual(false);
        });
    });
});