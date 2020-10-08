import { Classes, Menu, MenuItem } from "@blueprintjs/core";
import * as React from 'react';
import { LoadState } from '../utils/LoadState';
import './fileList.css';

export interface IFileListProps {
  filePaths: LoadState<string[]>;
  selectedFilePath: string | undefined;
  onSelectFile: (filePath: string) => void;
}

const MAX_FILES = 1000;

export const FileList: React.FC<IFileListProps> = ({ filePaths, selectedFilePath, onSelectFile }) => {
    if (filePaths.state === "loading") {
        return <FileListSkeleton />;
    }

    const files = limitMaxFiles(filePaths.value).map(path => (
        <MenuItem
            text={shortenPath(path)}
            title={path}
            onClick={() => onSelectFile(path)}
            active={path === selectedFilePath}
        />
    ));
    return <Menu className="file-list">
      {files}
      {filePaths.value.length > MAX_FILES ? <MenuItem text="More files not shown..." /> : undefined}
    </Menu>;
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

function limitMaxFiles(files: string[]) {
  if (files.length <= MAX_FILES) {
      return files;
  }
  return [...files].splice(0, MAX_FILES);
}