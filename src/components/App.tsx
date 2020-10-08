import { Classes, InputGroup, Label, TextArea } from "@blueprintjs/core";
import * as React from 'react';
import PanelGroup, { PanelWidth } from "react-panelgroup";
import { IFileContents, IMode, ISelectedNode, ISelection, ISettings } from "../model/model";
import { DIVIDER_COLOR } from "../utils/constants";
import { useDebouncedEffect } from "../utils/hooks/useDebouncedEffect";
import { useMessageListener } from "../utils/hooks/useMessageListener";
import { LoadState } from '../utils/LoadState';
import { ActionButtons } from "./ActionButtons";
import './app.css';
import { ExecutionPreview } from "./ExecutionPreview";
import { FileList } from "./FileList";
import { SettingsBar } from "./SettingsBar";

export interface IAppProps {
  vscode: any;
}

const DEFAULT_CODE = `
// Example - transform code
let lines = text.split("\\n").map(
  line => line.indexOf("import") === -1 ? line : line.toLowerCase()
);
return lines.filter(line => line !== undefined).join("\\n");

// Example - transform AST (switch the mode up top before uncommenting)
// if (node.kindName === "ImportDeclaration") {
//   return { ...node, moduleSpecifier: "another-package" };
// }
`;

const DEFUALT_PATH_GLOB = "**/*.ts*";

interface IState {
  pathGlob: string;
  searchText: string;
  selectedPath: string | undefined;
  code: string;
  layout: Layout;
  settings: ISettings;
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
  },
  settings: { mode: IMode.TransformCode },
};

export const App: React.FC<IAppProps> = ({ vscode }) => {
  const savedState = vscode.getState() as (IState | undefined);
  const initialState = savedState === undefined ? DEFAULT_STATE : savedState;
  const [pathGlob, setPathGlob] = React.useState<string>(initialState.pathGlob);
  const [layout, setLayout] = React.useState<Layout>(initialState.layout);
  const [searchText, setSearchText] = React.useState<string>(initialState.searchText);
  const [searchResults, setSearchResults] = React.useState<LoadState<string[]>>({ state: "loading" });
  const [selectedPath, setSelectedPath] = React.useState<string | undefined>(initialState.selectedPath);
  const [fileContents, setFileContents] = React.useState<IFileContents | undefined>(undefined);
  const [transformedContents, setTransformedContents] = React.useState<IFileContents | undefined>(undefined);
  const [selectedNode, setSelectedNode] = React.useState<ISelectedNode | undefined>(undefined);
  const [code, setCode] = React.useState<string>(initialState.code);
  const [selection, setSelection] = React.useState<ISelection>({ start: undefined, end: undefined });
  const [settings, setSettings] = React.useState<ISettings>(initialState.settings);

  React.useEffect(() => {
    vscode.setState({
      pathGlob,
      searchText,
      selectedPath,
      code,
      layout,
      settings,
    });
  }, [pathGlob, searchText, selectedPath, code, layout, settings])

  React.useEffect(() => {  
    if (initialState.selectedPath !== undefined && fileContents === undefined) {
      handleSelectFile(initialState.selectedPath);
    }
  }, []);

  useDebouncedEffect(() => {
    vscode.postMessage({
      command: "search-text-changed",
      pathGlob,
      searchText,
    });
  }, 750, [searchText, pathGlob]);

  React.useEffect(() => {
    vscode.postMessage({
      command: "search-text-changed",
      pathGlob,
      searchText,
    });
  }, []);

  useDebouncedEffect(() => {
    if (selectedPath === undefined || fileContents === undefined) {
      return;
    }

    vscode.postMessage({
      command: "transform-file-contents",
      path: selectedPath,
      contents: fileContents.code,
      mode: settings.mode,
      code,
    });
  }, 100, [code, fileContents && fileContents.code, selectedPath, settings.mode]);

  useDebouncedEffect(() => {
    if (selectedPath === undefined || fileContents === undefined || selection.start === undefined || settings.mode !== IMode.TransformAST) {
      setSelectedNode(undefined);
      return;
    }

    vscode.postMessage({
      command: "transform-selected-node",
      path: selectedPath,
      contents: fileContents.code,
      code,
      selection,
    });
  }, 100, [code, selection, fileContents && fileContents.code, selectedPath]);

  useMessageListener((message: any) => {
    switch (message.command) {
        case "new-search-results":
          setSearchResults({ state: "loaded", value: message.searchResults });
          break;
        case "loaded-file-contents":
          setFileContents({ code: message.contents, ast: message.ast });
          break;
        case "transformed-file-contents":
          setTransformedContents(message.transformedContents);
          break;
        case "transformed-selected-node":
          setSelectedNode(message.selectedNode);
          break;
    }
  });

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
        mode: settings.mode,
        code,
    });
  };

  const handleClickReplace = () => {
    vscode.postMessage({
        command: "replace-all",
        paths: [selectedPath],
        mode: settings.mode,
        code,
    });
  };

  const handleChangeCode = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(event.target.value);
  };

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
            <div className="code-and-settings-row">
              <SettingsBar
                settings={settings}
                onChangeSettings={setSettings}
                onSelectExample={setCode}
              />
              <TextArea className="code" onChange={handleChangeCode} value={code} />
            </div>
            <div className="preview-and-execute-row">
              <ExecutionPreview
                inputFilePath={selectedPath}
                inputFileContents={fileContents}
                outputFileContents={transformedContents}
                selectedNode={selectedNode}
                selection={selection}
                beforeVsAfterSplit={layout.beforeVsAfterSplit}
                mode={settings.mode}
                onChangeSelection={setSelection}
                onChangeBeforeVsAfterSplit={beforeVsAfterSplit => setLayout({ ...layout, beforeVsAfterSplit })}
              />
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
