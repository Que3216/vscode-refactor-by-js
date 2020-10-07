import { Classes, Menu, MenuItem } from "@blueprintjs/core";
import * as React from 'react';
import { LoadState } from '../utils/LoadState';
import './fileList.css';

export interface IFileListProps {
  filePaths: LoadState<string[]>;
  selectedFilePath: string | undefined;
  onSelectFile: (filePath: string) => void;
}

export const FileList: React.FC<IFileListProps> = ({ filePaths, selectedFilePath, onSelectFile }) => {
    if (filePaths.state === "loading") {
        return <FileListSkeleton />;
    }

    const files = filePaths.value.map(path => (
        <MenuItem
            text={shortenPath(path)}
            title={path}
            onClick={() => onSelectFile(path)}
            active={path === selectedFilePath}
        />
    ));
    return <Menu className="file-list">{files}</Menu>;
};


const FileListSkeleton: React.FC<{}> = () => (
  <Menu className={"file-list " + Classes.SKELETON}>
    <MenuItem text="skeleton-result" />
    <MenuItem text="skeleton-result" />
    <MenuItem text="skeleton-result" />
  </Menu>
);

function shortenPath(path: string) {
  if (path.length > 30) {
    return "..." + path.substr(-30);
  }
  return path;
}
