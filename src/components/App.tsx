import { Classes, Colors, InputGroup, Label, TextArea } from "@blueprintjs/core";
import { debounce } from "lodash-es";
import * as React from 'react';
import PanelGroup, { PanelWidth } from "react-panelgroup";
import { LoadState } from '../utils/LoadState';
import { ActionButtons } from "./ActionButtons";
import './app.css';
import { FileList } from "./FileList";

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
  layout: Layout;
}

interface Layout {
  searchSidebarVsMainSplit: PanelWidth[];
  codeVsResultsSplit: PanelWidth[];
  beforeVsAfterSplit: PanelWidth[];
}

const DEFAULT_STATE: IState = {
  pathGlob: DEFUALT_PATH_GLOB,
  searchText: "",
  selectedPath: undefined,
  code: DEFAULT_CODE,
  layout: {
    searchSidebarVsMainSplit: [{ size: 250 }, {}],
    codeVsResultsSplit: [{ size: 300 }, {}],
    beforeVsAfterSplit: [],
  }
};

// Matches vscode color
// TODO: Import vscode library
const DIVIDER_COLOR = "#424242";

export const App: React.FC<IAppProps> = ({ vscode }) => {
  const savedState = vscode.getState() as (IState | undefined);
  const initialState = savedState === undefined ? DEFAULT_STATE : savedState;
  const [pathGlob, setPathGlob] = React.useState<string>(initialState.pathGlob);
  const [layout, setLayout] = React.useState<Layout>(initialState.layout);
  const [searchText, setSearchText] = React.useState<string>(initialState.searchText);
  const [searchResults, setSearchResults] = React.useState<LoadState<string[]>>({ state: "loading" });
  const [selectedPath, setSelectedPath] = React.useState<string | undefined>(initialState.selectedPath);
  const [fileContents, setFileContents] = React.useState<string | undefined>(undefined);
  const [code, setCode] = React.useState<string>(initialState.code);

  React.useEffect(() => {
    vscode.setState({
      pathGlob,
      searchText,
      selectedPath,
      code,
      layout,
    });
  }, [pathGlob, searchText, selectedPath, code, layout])

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

  const handleReceiveMessage = (event: any) => {
    const message = event.data; // The json data that the extension sent
    switch (message.command) {
        case "new-search-results":
          setSearchResults({ state: "loaded", value: message.searchResults });
          break;
        case "loaded-file-contents":
          setFileContents(message.contents);
          break;
    }
  };

  const handleChangePathGlob = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPathGlob(event.target.value)
  };

  const handleChangeSearchText = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value)
  };

  const handleClickReplaceAll = () => {
    if (searchResults.state === "loading") {
      throw new Error("Button is disabled while results are loading, so this should be impossible");
    }
    vscode.postMessage({
        command: "replace-all",
        paths: searchResults.value,
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

  return (
    <div className={"app " + Classes.DARK}>
      <PanelGroup
        direction="row"
        borderColor={DIVIDER_COLOR}
        panelWidths={layout.searchSidebarVsMainSplit}
        onUpdate={widths => setLayout({ ...layout, searchSidebarVsMainSplit: widths as PanelWidth[] })}
      >
        <div className="search-column">
          <Label className="search-box-label">
            Search text
            <InputGroup onChange={handleChangeSearchText} value={searchText} />
          </Label>
          <Label className="search-box-label">
            Files to include
            <InputGroup onChange={handleChangePathGlob} value={pathGlob} />
          </Label>
          <FileList
            filePaths={searchResults}
            selectedFilePath={selectedPath}
            onSelectFile={handleSelectFile}
          />
        </div>
        <div className="editor-column">
          <PanelGroup
            direction="column"
            borderColor={DIVIDER_COLOR}
            panelWidths={layout.codeVsResultsSplit}
            onUpdate={widths => setLayout({ ...layout, codeVsResultsSplit: widths as PanelWidth[] })}
          >
            <TextArea className="code" onChange={handleChangeCode} value={code} />
            <div className="preview-and-execute-row">
              <div className="previews">
                <PanelGroup
                  direction="row"
                  borderColor={DIVIDER_COLOR}
                  panelWidths={layout.beforeVsAfterSplit}
                  onUpdate={widths => setLayout({ ...layout, beforeVsAfterSplit: widths as PanelWidth[] })}
                >
                  <div className="file-contents-before">
                    <h3 className="panel-header">Before</h3>
                    <pre className="code-preview">
                      {fileContents}
                    </pre>
                  </div>
                  <div className="file-contents-after">
                    <h3 className="panel-header">After</h3>
                    <pre className="code-preview">
                      {fileContents && evalReplacement(fileContents, code)}
                    </pre>
                  </div>
                </PanelGroup>
              </div>
              <ActionButtons
                selectedPath={selectedPath}
                numSearchResults={searchResults.state === "loading" ? 0 : searchResults.value.length}
                onClickReplace={handleClickReplace}
                onClickReplaceAll={handleClickReplaceAll}
              />
            </div>
          </PanelGroup>
        </div>
      </PanelGroup>
    </div>
  );
};

function evalReplacement(fileContents: string, code: string) {
  const stringifiedContents = JSON.stringify({ fileContents: fileContents });
  const fullCode = `let data = ${stringifiedContents}; function replace(text) { ${code} }; replace(data.fileContents);`
  try {
    return eval(fullCode);
  } catch (e) {
    return "" + e;
  }
}
