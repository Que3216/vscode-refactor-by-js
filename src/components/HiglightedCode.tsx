import hljs from 'highlight.js';
import 'highlight.js/styles/vs2015.css';
import * as React from 'react';

export interface IHighlightedCode {
  code: string;
  filePath?: string;
}

export const HighlightedCode: React.FC<IHighlightedCode> = ({ code, filePath }) => {
  const codeEl = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (codeEl.current) {
      hljs.highlightBlock(codeEl.current);
    }
  }, [code, codeEl.current]);

  return (
    <code ref={codeEl} className={getLanguage(filePath)}>
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
