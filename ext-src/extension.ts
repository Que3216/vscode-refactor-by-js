import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { sourceFileToAst, astToSourceFile } from "./sourceFileToFromAst";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('refactor-by-js.start', () => {
		RefactorByJsPanel.createOrShow(context.extensionPath);
	}));


	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(RefactorByJsPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				RefactorByJsPanel.revive(webviewPanel, context.extensionPath);
			}
		});
	}
}

interface IFileContents {
	ast: string;
	code: string;
}

/**
 * Manages refactor by js panels
 */
class RefactorByJsPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: RefactorByJsPanel | undefined;

	public static readonly viewType = 'refactor-by-js';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];
	private currentSearch: vscode.CancellationTokenSource = new vscode.CancellationTokenSource();

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		// If we already have a panel, show it.
		// Otherwise, create a new panel.
		if (RefactorByJsPanel.currentPanel) {
			RefactorByJsPanel.currentPanel._panel.reveal(column);
		} else {
			const panel = vscode.window.createWebviewPanel(RefactorByJsPanel.viewType, "Refactor by JS", column || vscode.ViewColumn.One, {
				// Enable javascript in the webview
				enableScripts: true,
	
				// And restric the webview to only loading content from our extension's `media` directory.
				localResourceRoots: [
					vscode.Uri.file(path.join(extensionPath, 'build'))
				]
			});
			RefactorByJsPanel.currentPanel = new RefactorByJsPanel(panel, extensionPath);
		}
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		RefactorByJsPanel.currentPanel = new RefactorByJsPanel(panel, extensionPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._extensionPath = extensionPath;
		this._panel = panel;
		
		// Set the webview's initial html content 
		this._panel.webview.html = this._getHtmlForWebview();

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._panel.webview.html = this._getHtmlForWebview();
				}
			},
			null,
			this._disposables
		);

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case 'search-text-changed':
					this.searchFor(message.pathGlob, message.searchText);
					return;
				case 'load-file-contents':
					const contents = fs.readFileSync(message.path, "utf8");
					this._panel.webview.postMessage({
						command: 'loaded-file-contents',
						path: message.path,
						contents: contents,
						ast: sourceFileToAst(message.path, contents),
					});
					return;
				case 'transform-file-contents':
					this._panel.webview.postMessage({
						command: 'transformed-file-contents',
						path: message.path,
						contents: message.contents,
						code: message.code,
						transformedContents: transformFile(message.path, message.contents, message.code),
					});
					return;
				case 'replace-all':
					vscode.window.withProgress({ title: "Refactor by JS", location: vscode.ProgressLocation.Notification, cancellable: true }, async (progress, token) => {
						progress.report({ message: "Transforming contents of " + message.paths.length + " files...", increment: 0 });
						let filesProcessed = 0;
						
						for (let path of message.paths) {
							if (token.isCancellationRequested) {
								return;
							}

							try {
								const fileUri = vscode.Uri.file(path);
								const encodedContents = await vscode.workspace.fs.readFile(fileUri);
								const decodedContents = new TextDecoder("utf-8").decode(encodedContents);
								const updatedContents = evalReplacementToString(path, decodedContents, message.code);
								if (updatedContents !== decodedContents) {
									await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(updatedContents));
								}
							} catch (ex) {
								vscode.window.showErrorMessage("Error transforming " + path + ": " + ex);
							}

							filesProcessed++;
							progress.report({
								message: "Transformed contents of " + filesProcessed + " of " + message.paths.length + " files...",
								increment: 100 / message.paths.length,
							});
						}
					});
					return;
			}
		}, null, this._disposables);
	}

	private async searchFor(pathGlob: string, searchText: string) {
		this.currentSearch.cancel();
		this.currentSearch.dispose();
		this.currentSearch = new vscode.CancellationTokenSource();
		const uris = await vscode.workspace.findFiles(pathGlob, undefined, undefined, this.currentSearch.token);

		if (!searchText) {
			this._panel.webview.postMessage({ command: 'new-search-results', searchResults: uris.map(uri => uri.fsPath) });
			return;
		}

		vscode.window.withProgress({ title: "Refactor by JS", location: vscode.ProgressLocation.Notification, cancellable: true }, async (progress, token) => {
			progress.report({ message: "Searching " + uris.length + " files...", increment: 0 });
			let filesProcessed = 0;
			const filteredUris = [];

			for (let uri of uris) {
				if (token.isCancellationRequested || this.currentSearch.token.isCancellationRequested) {
					return;
				}

				const encodedContents = await vscode.workspace.fs.readFile(uri);
				const decodedContents = new TextDecoder("utf-8").decode(encodedContents);
				if (decodedContents.indexOf(searchText) > -1) {
					filteredUris.push(uri);
				}

				filesProcessed++;
				progress.report({
					message: "Searched " + filesProcessed + " of " + uris.length + " files...",
					increment: 100 / uris.length,
				});
			}

			this._panel.webview.postMessage({ command: 'new-search-results', searchResults: filteredUris.map(uri => uri.fsPath) });
		});
	}

	public dispose() {
		RefactorByJsPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();
		this.currentSearch.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _getHtmlForWebview() {
		const manifest = require(path.join(this._extensionPath, 'build', 'asset-manifest.json'));
		const mainScript = manifest['main.js'];
		const mainStyle = manifest['main.css'];

		const scriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'build', mainScript));
		const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
		const stylePathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'build', mainStyle));
		const styleUri = stylePathOnDisk.with({ scheme: 'vscode-resource' });

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
				<meta name="theme-color" content="#000000">
				<title>Refactor by JS</title>
				<link rel="stylesheet" type="text/css" href="${styleUri}">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'unsafe-eval' 'nonce-${nonce}';style-src vscode-resource: 'unsafe-inline' http: https: data:;">
				<base href="${vscode.Uri.file(path.join(this._extensionPath, 'build')).with({ scheme: 'vscode-resource' })}/">
			</head>

			<body>
				<noscript>You need to enable JavaScript to run this app.</noscript>
				<div id="root"><center><h3>Loading...</h3><center></div>
				
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

function evalReplacement(filePath: string, fileContents: string, code: string): string {
	const stringifiedContents = JSON.stringify( { code: fileContents, ast: JSON.parse(sourceFileToAst(filePath, fileContents)) } );
	const fullCode = `let data = ${stringifiedContents}; function replace(text, ast) { ${code} }; replace(data.code, data.ast);`
	return eval(fullCode);
}

function evalReplacementToString(filePath: string, fileContents: string, code: string): string {
	const result = evalReplacement(filePath, fileContents, code);
	if (typeof result === "string") {
		return result;
	  } else {
		return astToSourceFile(filePath, fileContents, result);
	  }
}

function transformFile(filePath: string, fileContents: string, code: string): IFileContents {
	try {
	  const result = evalReplacement(filePath, fileContents, code);
	  if (typeof result === "string") {
		return { code: result, ast: sourceFileToAst(filePath, result) };
	  } else {
		return { code: astToSourceFile(filePath, fileContents, result), ast: JSON.stringify(result, null, "  ") };
	  }
	} catch (e) {
	  return { code: "" + e, ast: "" + e };
	}
}
