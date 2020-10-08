import { Button, Classes, HTMLSelect, Label, Menu, MenuItem, Popover } from "@blueprintjs/core";
import * as React from 'react';
import { IMode, ISettings } from "../model/model";
import { EXAMPLES, IExample } from "../utils/constants";
import './settingsBar.css';

export interface ISettingsBarProps {
    settings: ISettings;
    onChangeSettings: (settings: ISettings) => void;
    onSelectExample: (code: string) => void;
}

const SELECT_OPTIONS = [
    { value: IMode.TransformCode, label: "Transform code" },
    { value: IMode.TransformAST, label: "Transform AST" }
];

export const SettingsBar: React.FC<ISettingsBarProps> = ({ settings, onChangeSettings, onSelectExample }) => {
    const handleChangeMode = (event: React.ChangeEvent<HTMLSelectElement>) => {
        onChangeSettings({ ...settings, mode: event.target.value as IMode });
    };

    const handleSelectExample = (example: IExample) => {
        if (example.mode !== settings.mode) {
            onChangeSettings({ ...settings, mode: example.mode });
        }
        onSelectExample(example.code);
    }

    return (
        <div className="settings-bar">
            <Label className={Classes.INLINE + " mode-label"}>
                Mode:
                <HTMLSelect options={SELECT_OPTIONS} value={settings.mode} onChange={handleChangeMode}/>
            </Label>
            <Popover content={<ExamplesList onSelectExample={handleSelectExample} />} position="bottom">
                <Button className={"examples-button"}>Examples</Button>
            </Popover>
        </div>
    );
};

const ExamplesList: React.FC<{ onSelectExample: (code: IExample) => void }> = ({ onSelectExample }) => {
    return <Menu>
        {EXAMPLES.map(example => <MenuItem text={example.name} onClick={() => onSelectExample(example)} />)}
        </Menu>;
}
