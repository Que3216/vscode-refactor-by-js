import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { App } from './App';
import './index.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import { Classes, NonIdealState } from '@blueprintjs/core';

declare var acquireVsCodeApi: any;

try {
  const vscode = acquireVsCodeApi();

  ReactDOM.render(
    <App vscode={vscode} />,
    document.getElementById('root') as HTMLElement
  );
} catch (e) {
  console.error(e);
  ReactDOM.render(
    <div className={"app " + Classes.DARK}>
      <NonIdealState title="Something went wrong" description={e + ""} />
    </div>,
    document.getElementById('root') as HTMLElement
  );
}
