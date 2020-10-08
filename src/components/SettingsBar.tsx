import { Button, Checkbox, Classes, FormGroup, HTMLSelect, Icon, Label, Menu, MenuItem, Popover } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import * as React from 'react';
import { IMode, IPostProcessingSettings, ISettings } from "../model/model";
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

    const handleChangePostProcessingSettings = (postProcessing: IPostProcessingSettings) => {
        onChangeSettings({ ...settings, postProcessing });
    };

    return (
        <div className="settings-bar">
            <Label className={Classes.INLINE + " mode-label"}>
                Mode:
                <HTMLSelect options={SELECT_OPTIONS} value={settings.mode} onChange={handleChangeMode}/>
            </Label>
            <Popover content={<PostProcessingSettings settings={settings.postProcessing} onChangeSettings={handleChangePostProcessingSettings} />} position="bottom">
                <Button className={"post-processing-button"} icon={IconNames.SETTINGS}>Post processing</Button>
            </Popover>
            <Popover content={<ExamplesList onSelectExample={handleSelectExample} />} position="bottom">
                <Button className={"examples-button"} icon={IconNames.HELP}>Examples</Button>
            </Popover>
        </div>
    );
};

const ExamplesList: React.FC<{ onSelectExample: (code: IExample) => void }> = ({ onSelectExample }) => {
    return <Menu>
        {EXAMPLES.map(example => <MenuItem text={example.name} onClick={() => onSelectExample(example)} />)}
        </Menu>;
}

const PostProcessingSettings: React.FC<{
    onChangeSettings: (newSettings: IPostProcessingSettings) => void,
    settings: IPostProcessingSettings
}> = ({ onChangeSettings, settings }) => {
    const checkbox = <K extends keyof IPostProcessingSettings>(key: K, label: string) => {
        return <Checkbox
            label={label}
            checked={settings[key]}
            onChange={handleBooleanChange(value => onChangeSettings({ ...settings, [key]: value }))}
        />
    }

    return <FormGroup
        label="If code is modified:"
        className="post-processing-settings"
    >
        {checkbox("fixMissingImports", "Fix Missing Imports")}
        {checkbox("fixUnusedIdentifiers", "Fix Unused Identifiers")}
        {checkbox("formatCode", "Format Code")}
        {checkbox("organizeImports", "Organize Imports")}
    </FormGroup>;
}

function handleBooleanChange(handler: (checked: boolean) => void) {
    return (event: React.FormEvent<HTMLElement>) => handler((event.target as HTMLInputElement).checked);
}
