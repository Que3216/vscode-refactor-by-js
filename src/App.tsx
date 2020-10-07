import * as React from 'react';
import './app.css';
import { Button, Classes, InputGroup, Menu, MenuItem, TextArea } from "@blueprintjs/core";
import { debounce } from "lodash-es";

export interface IAppProps {
  vscode: any;
}

const DEFAULT_CODE = `
let lines = text.split("\\n");
lines = lines.map(line => {
  if (line.indexOf("import") === -1) {
    return line;
  }

  return line.toLowerCase();
});
return lines.filter(line => line !== undefined).join("\\n");
`;

const DEFUALT_PATH_GLOB = "**/*.ts*";

interface IState {
  pathGlob: string;
  searchText: string;
  selectedPath: string | undefined;
  code: string;
}

const DEFAULT_STATE: IState = {
  pathGlob: DEFUALT_PATH_GLOB,
  searchText: "",
  selectedPath: undefined,
  code: DEFAULT_CODE,
};

export const App: React.FC<IAppProps> = ({ vscode }) => {
  const savedState = vscode.getState() as (IState | undefined);
  const initialState = savedState === undefined ? DEFAULT_STATE : savedState;
  const [pathGlob, setPathGlob] = React.useState<string>(initialState.pathGlob);
  const [searchText, setSearchText] = React.useState<string>(initialState.searchText);
  const [searchResults, setSearchResults] = React.useState<string[] | undefined>(undefined);
  const [selectedPath, setSelectedPath] = React.useState<string | undefined>(initialState.selectedPath);
  const [fileContents, setFileContents] = React.useState<string | undefined>(undefined);
  const [code, setCode] = React.useState<string>(initialState.code);

  React.useEffect(() => {
    vscode.setState({
      pathGlob,
      searchText,
      selectedPath,
      code,
    });
  }, [pathGlob, searchText, selectedPath, code])

  React.useEffect(() => {
    if (initialState.selectedPath !== undefined && fileContents === undefined) {
      handleSelectFile(initialState.selectedPath);
    }
  }, []);

  React.useEffect(debounce(() => {
    vscode.postMessage({
      command: "search-text-changed",
      pathGlob,
      searchText,
    });
  }, 1000), [searchText, pathGlob]);

  React.useEffect(() => {
    vscode.postMessage({
      command: "search-text-changed",
      pathGlob,
      searchText,
    });
  }, []);

  React.useEffect(() => {
    window.addEventListener("message", handleReceiveMessage);
    return () => window.removeEventListener("message", handleReceiveMessage);
  }, []);

  const handleChangePathGlob = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPathGlob(event.target.value)
  };

  const handleChangeSearchText = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value)
  };

  const handleClickReplaceAll = () => {
    vscode.postMessage({
        command: "replace-all",
        paths: searchResults,
        code,
    });
  };

  const handleClickReplace = () => {
    vscode.postMessage({
        command: "replace-all",
        paths: [selectedPath],
        code,
    });
  };

  const handleChangeCode = debounce((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(event.target.value);
  }, 100);


  const handleSelectFile = (path: string) => {
    setSelectedPath(path);
    setFileContents(undefined);
    vscode.postMessage({
        command: "load-file-contents",
        path: path
    });
  };

  const handleReceiveMessage = (event: any) => {
    const message = event.data; // The json data that the extension sent
    switch (message.command) {
        case "new-search-results":
          setSearchResults(message.searchResults);
          break;
        case "loaded-file-contents":
          setFileContents(message.contents);
          break;
    }
  };

  const searchResultsMenu = (
    <Menu className="search-results">
        {(searchResults || []).map(path => <MenuItem text={shortenPath(path)} title={path} onClick={() => handleSelectFile(path)} active={path === selectedPath} />)}
    </Menu>
  );

  return (
    <div className={"app " + Classes.DARK}>
      <div className="search-column">
        <InputGroup placeholder="" onChange={handleChangeSearchText} value={searchText} />
        <InputGroup placeholder="Files to include" onChange={handleChangePathGlob} value={pathGlob} />
        {searchResults === undefined ? <SearchResultsSkeleton /> : searchResultsMenu}
      </div>
      <div className="editor-column">
        <TextArea className="code" onChange={handleChangeCode} value={code} />
        <div className="previews">
          <div className="file-contents-before">
            <h3>Before</h3>
            <pre className="code-preview">
              {fileContents}
            </pre>
          </div>
          <div className="file-contents-after">
            <h3>After</h3>
            <pre className="code-preview">
              {fileContents && evalReplacement(fileContents, code)}
            </pre>
          </div>
        </div>
        <div className="buttons">
          <Button
            disabled={selectedPath === undefined}
            text={selectedPath !== undefined ? "Replace in " + getFileName(selectedPath) : "Replace"}
            onClick={handleClickReplace}
          />
          <Button
            intent="primary"
            disabled={searchResults === undefined || searchResults.length === 0}
            text={searchResults === undefined ? "Replace in all files" : "Replace in all " + searchResults.length + " file(s)"}
            onClick={handleClickReplaceAll}
          />
        </div>
      </div>
    </div>
  );
};


const SearchResultsSkeleton: React.FC<{}> = () => (
  <Menu className={"search-results " + Classes.SKELETON}>
    <MenuItem text="skeleton-result" />
    <MenuItem text="skeleton-result" />
    <MenuItem text="skeleton-result" />
  </Menu>
);

function getFileName(path: string) {
  if (!path) {
    return "";
  }
  const parts = path.split("/");
  return parts[parts.length - 1];
}

function evalReplacement(fileContents: string, code: string) {
  const stringifiedContents = JSON.stringify({ fileContents: fileContents });
  const fullCode = `let data = ${stringifiedContents}; function replace(text) { ${code} }; replace(data.fileContents);`
  try {
    return eval(fullCode);
  } catch (e) {
    return "" + e;
  }
}

function shortenPath(path: string) {
  if (path.length > 30) {
    return "..." + path.substr(-30);
  }
  return path;
}