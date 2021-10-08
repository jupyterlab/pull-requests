import { DocumentRegistry } from '@jupyterlab/docregistry';
import {
  caretDownIcon,
  caretUpIcon,
  linkIcon
} from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import React from 'react';
import { BeatLoader } from 'react-spinners';
import { CommandIDs, IFile, IPullRequest } from '../../tokens';
import { requestAPI } from '../../utils';
import { ActionButton } from '../ActionButton';
import { FileItem } from './FileItem';

/**
 * PullRequestItem properties
 */
export interface IPullRequestItemProps {
  /**
   * Jupyter Front End Commands Registry
   */
  commands: CommandRegistry;
  /**
   * The document registry
   */
  docRegistry: DocumentRegistry;
  /**
   * Pull request description
   */
  pullRequest: IPullRequest;
}

/**
 * Open an URL in a new window
 *
 * @param link URL to open
 */
function openLink(link: string): void {
  window.open(link, '_blank');
}

/**
 * PullRequestItem component
 *
 * @param props Component properties
 */
export function PullRequestItem(props: IPullRequestItemProps): JSX.Element {
  const { commands, docRegistry, pullRequest } = props;
  /**
   * Pull request modified files
   */
  const [files, setFiles] = React.useState<IFile[] | null>(null);
  /**
   * Is the file list expanded?
   */
  const [isExpanded, setIsExpanded] = React.useState<boolean>(false);
  /**
   * Is the file list being loaded?
   */
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  /**
   * Error message
   */
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFiles(null);
    setIsExpanded(false);
    setIsLoading(false);
    setError(null);
  }, [props.pullRequest]);

  const fetchFiles = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const results = (await requestAPI(
        'pullrequests/prs/files?id=' + encodeURIComponent(pullRequest.id),
        'GET'
      )) as any[];
      setFiles(
        results.map((rawFile: any): IFile => {
          const path = rawFile.name;
          return {
            ...rawFile,
            fileType:
              docRegistry.getFileTypesForPath(path)[0] ||
              DocumentRegistry.getDefaultTextFileType()
          };
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  // This makes a shallow copy of data[i], the data[i].files are not copied
  // If files need to be mutated, will need to restructure props / deep copy
  const toggleFilesExpanded = (): void => {
    if (files === null && !isExpanded) {
      setError(null);
      fetchFiles()
        .then(() => {
          setIsExpanded(!isExpanded);
        })
        .catch(reason => {
          setError(`Failed to get pull request files ${reason}`);
        });
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <li
      key={pullRequest.id}
      onClick={(): void => {
        commands.execute(CommandIDs.prOpenDescription, { pullRequest } as any);
      }}
    >
      <div className="jp-PullRequestBrowserItemListItem">
        <h2>{pullRequest.title}</h2>
        <div className="jp-PullRequestBrowserItemListItemIconWrapper">
          <ActionButton
            icon={linkIcon}
            onClick={(e): void => {
              e.stopPropagation();
              openLink(pullRequest.link);
            }}
            title="Open in new tab"
          />
          <ActionButton
            icon={isExpanded ? caretUpIcon : caretDownIcon}
            onClick={(e): void => {
              e.stopPropagation();
              toggleFilesExpanded();
            }}
            title={isExpanded ? 'Hide modified files' : 'Show modified files'}
          />
        </div>
      </div>
      {isLoading ? (
        <BeatLoader
          sizeUnit={'px'}
          size={5}
          color={'var(--jp-ui-font-color1)'}
          loading={isLoading}
        />
      ) : (
        isExpanded &&
        (error ? (
          <div>
            <h2 className="jp-PullRequestBrowserGroupError">
              Error Listing Pull Request Files:
            </h2>
            {error}
          </div>
        ) : (
          <ul className="jp-PullRequestBrowserItemFileList">
            {files?.map(file => (
              <li
                key={`${pullRequest.internalId}-${file.name}`}
                onClick={(e): void => {
                  e.stopPropagation();
                  commands.execute(CommandIDs.prOpenDiff, {
                    file,
                    pullRequest
                  } as any);
                }}
              >
                <FileItem file={file} />
              </li>
            ))}
          </ul>
        ))
      )}
    </li>
  );
}
