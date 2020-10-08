import hljs from 'highlight.js';
import 'highlight.js/styles/vs2015.css';
import * as React from 'react';

export interface IHighlightedCode {
  code: string;
  filePath?: string;
  onChangeSelection?: (start: number | undefined, end: number | undefined) => void;
}

export const HighlightedCode: React.FC<IHighlightedCode> = ({ code, filePath, onChangeSelection }) => {
  const codeEl = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (!codeEl.current) {
      return;
    }
    hljs.highlightBlock(codeEl.current);
  }, [code, codeEl.current]);

  React.useEffect(() => {
    if (onChangeSelection === undefined) {
        return;
    }
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  const handleSelectionChange = () => {
    if (codeEl.current === undefined || codeEl.current === null || onChangeSelection === undefined) {
        return;
    }
    const selection = document.getSelection();
    if (selection === undefined || selection === null) {
        onChangeSelection(undefined, undefined);
        return;
    }
    const range = selection.getRangeAt(0);
    let clonedRange = range.cloneRange();
    clonedRange.selectNodeContents(codeEl.current);
    clonedRange.setEnd(range.startContainer, range.startOffset);
    const start = clonedRange.toString().length;
    clonedRange = range.cloneRange();
    clonedRange.selectNodeContents(codeEl.current);
    clonedRange.setEnd(range.endContainer, range.endOffset);
    const end = clonedRange.toString().length;
    onChangeSelection(start, end);
  };

  return (
    <code ref={codeEl} contentEditable={onChangeSelection !== undefined} className={getLanguage(filePath)}>
        {code}
    </code>
  );
};

function getLanguage(filePath: string | undefined) {
    if (!filePath) {
        return "";
    }

    const parts = filePath.split(".");
    const extension = parts[parts.length - 1];

    if (extension === "tsx" || extension === "ts") {
        return "language-typescript";
    }
    
    if (extension === "jsx" || extension === "js") {
        return "language-javascript";
    }

    if (extension === "json") {
        return "language-json";
    }

    if (extension === "yml" || extension === "yaml") {
        return "language-yaml";
    }

    return "";
}
