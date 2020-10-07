import { Button } from "@blueprintjs/core";
import * as React from 'react';
import './actionButtons.css';

export interface IActionButtonsProps {
  selectedPath: string | undefined;
  numSearchResults: number;
  onClickReplace: () => void;
  onClickReplaceAll: () => void;
}

export const ActionButtons: React.FC<IActionButtonsProps> = ({ selectedPath, numSearchResults, onClickReplace, onClickReplaceAll }) => {
  return (
    <div className="buttons">
        <Button
            disabled={selectedPath === undefined}
            text={selectedPath !== undefined ? "Replace in " + getFileName(selectedPath) : "Replace"}
            onClick={onClickReplace}
        />
        <Button
            intent="primary"
            disabled={numSearchResults === 0}
            text={"Replace in all " + numSearchResults + " file(s)"}
            onClick={onClickReplaceAll}
        />
    </div>
    );
};

function getFileName(path: string) {
  if (!path) {
    return "";
  }
  const parts = path.split("/");
  return parts[parts.length - 1];
}
