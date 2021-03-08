import * as samplepr from './sample-responses/samplepr.json';
import { PullRequestCommentThreadModel, PullRequestFileModel, IComment, PullRequestModel } from '../../src/models';

export let SAMPLE_PR_JSON: string = JSON.stringify(samplepr);

export let SamplePullRequestItem = new PullRequestModel(
    "https://api.github.com/repos/timnlupo/juypterlabpr-test/pulls/1",
    "Interesting PR for feature",
    "This is a feature that tests a bunch of different types",
    "https://github.com/repos/timnlupo/juypterlabpr-test/pulls/1",
    "457075994"
);

export let SamplePullRequestIpynbFileItem = new PullRequestFileModel(
    "test.ipynb",
    "modified",
    12,
    23,
    SamplePullRequestItem
);

export let SamplePullRequestPlainFileItem = new PullRequestFileModel(
    "test.js",
    "modified",
    12,
    23,
    SamplePullRequestItem
);

export let SamplePullRequestCommentItem: IComment = {
    id: 296364299,
    text: "too boring",
    lineNumber: 9,
    username: "timnlupo",
    userpic: "https://avatars1.githubusercontent.com/u/9003282?v=4",
    updatedAt: "2011-04-14T16:00:49Z"
}

export let SamplePullRequestCommentThreadItemNew = new PullRequestCommentThreadModel(
    SamplePullRequestIpynbFileItem,
    3
);

export let SamplePullRequestCommentThreadItemReply = new PullRequestCommentThreadModel(
    SamplePullRequestIpynbFileItem,
    SamplePullRequestCommentItem
);
