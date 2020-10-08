import { Tab, Tabs } from "@blueprintjs/core";
import * as React from 'react';
import PanelGroup, { PanelWidth } from "react-panelgroup";
import { IFileContents, IMode, ISelectedNode, ISelection } from "../model/model";
import { DIVIDER_COLOR } from "../utils/constants";
import './executionPreview.css';
import { HighlightedCode } from "./HiglightedCode";

export interface IExecutionPreviewProps {
  inputFilePath: string | undefined;
  inputFileContents: IFileContents | undefined;
  outputFileContents: IFileContents | undefined;
  selectedNode: ISelectedNode | undefined;
  selection: ISelection;
  beforeVsAfterSplit: PanelWidth[];
  mode: IMode;

  onChangeSelection: (newSelection: ISelection) => void;
  onChangeBeforeVsAfterSplit: (newSplit: PanelWidth[]) => void;
}

export const ExecutionPreview: React.FC<IExecutionPreviewProps> = ({
    inputFilePath,
    inputFileContents,
    outputFileContents,
    selectedNode,
    selection,
    beforeVsAfterSplit,
    mode,
    onChangeSelection,
    onChangeBeforeVsAfterSplit
}) => {

    const handleChangeSelection = (start: number | undefined, end: number | undefined) => {
        onChangeSelection({ start, end });
    };

    const inputFileCode = <HighlightedCode
        code={(inputFileContents && inputFileContents.code) || ""}
        filePath={inputFilePath}
        onChangeSelection={handleChangeSelection}
    />;

    const outputFileCode = <HighlightedCode code={(outputFileContents && outputFileContents.code) || ""} filePath={inputFilePath} />;

    const inputPanelASTTabs = (
        <Tabs>
            <Tab id="code" title="Code" panel={inputFileCode} />
            <Tab id="ast" title="AST" panel={<HighlightedCode code={(inputFileContents && inputFileContents.ast) || ""} filePath={".json"} />} />
        </Tabs>
    );

    const outputPanelASTTabs = (
        <Tabs>
            <Tab id="code" title="Code" panel={outputFileCode} />
            <Tab id="ast" title="AST" panel={<HighlightedCode code={(outputFileContents && outputFileContents.ast) || ""} filePath={".json"} />} />
            <Tab id="selected-node" title="Selected Node" panel={<HighlightedCode code={getSelectedNodeText(selection, selectedNode)} filePath={".json"} />} />
        </Tabs>
    );

    return (
        <div className="previews">
            <PanelGroup
                direction="row"
                borderColor={DIVIDER_COLOR}
                panelWidths={beforeVsAfterSplit}
                onUpdate={widths => onChangeBeforeVsAfterSplit( widths as PanelWidth[] )}
            >
                <div className="file-contents-before">
                <h3 className="panel-header">Before</h3>
                <pre className="code-preview">
                    {mode === IMode.TransformCode ? inputFileCode : inputPanelASTTabs}
                </pre>
                </div>
                <div className="file-contents-after">
                <h3 className="panel-header">After</h3>
                <pre className="code-preview">
                    {mode === IMode.TransformCode ? outputFileCode : outputPanelASTTabs}
                </pre>
                </div>
            </PanelGroup>
        </div>
    );
};

function getSelectedNodeText(selection: ISelection, selectedNode: ISelectedNode | undefined) {
  if (selection.start === undefined) {
    return "// Drag to select a node on the left";
  }
  if (selectedNode === undefined) {
    return `// Transforming node at ${selection.start} to ${selection.end === undefined ? selection.start : selection.end}. Please wait...`;
  }
  return `// Input\n// -----\n${selectedNode.inputNodeJson}\n\n// Output\n// -----\n${selectedNode.outputNodeJson}`;
}
