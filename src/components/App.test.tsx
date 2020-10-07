import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';

it('renders without crashing', () => {
  const div = document.createElement('div');
  const mockVscode = {
    getState: () => undefined
  };
  ReactDOM.render(<App vscode={mockVscode} />, div);
  ReactDOM.unmountComponentAtNode(div);
});
