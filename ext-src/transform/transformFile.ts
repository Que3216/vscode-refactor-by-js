import * as tsMorph from 'ts-morph'
import { getSelectedNode } from '../getSelectedNode';
import { IFileContents, IMode, IPostProcessingSettings, ISelectedNode, ISelection, ISettings } from '../model';
import { sourceFileToAst } from '../sourceFileToAst';
import { findPathToPackageRoot } from './findPathToPackageRoot';
import { serializeNode, transformNode } from './transformNode';

export function transformFileForPreview(filePath: string, fileContents: string, code: string, settings: ISettings): IFileContents {
	try {
		const transformedCode = transformFile(filePath, fileContents, code, settings);
		return { code: transformedCode, ast: sourceFileToAst(filePath, transformedCode) };
	} catch (e) {
		return { code: "" + e, ast: "" + e };
	}
}

export function transformFile(filePath: string, fileContents: string, code: string, settings: ISettings): string {
	if (settings.mode === IMode.TransformCode) {
		const stringifiedContents = JSON.stringify( { text: fileContents, path: filePath, pathToPackageRoot: findPathToPackageRoot(filePath) } );
		const fullCode = `let data = ${stringifiedContents}; function replace(text, path, pathToPackageRoot) { ${code} }; replace(data.text, data.path, data.pathToPackageRoot);`
		const newText = eval(fullCode);
		if (newText === fileContents || !isPostProcessingEnabled(settings.postProcessing)) {
			return newText;
		}
		const project = new tsMorph.Project();
		const source = project.createSourceFile(filePath, newText, { overwrite: true });
		applyPostProcessing(source, settings.postProcessing);
		return source.getFullText();
	}

	const project = new tsMorph.Project();
	const originalSource = project.createSourceFile(filePath, fileContents, { overwrite: true });

	transformNode(originalSource, code, filePath);

	originalSource.forEachDescendantAsArray().forEach((node) => {
		if (node.wasForgotten()) {
			return;
		}

		transformNode(node, code, filePath);
	});

	if (originalSource.getFullText() === fileContents || !isPostProcessingEnabled(settings.postProcessing)) {
		return fileContents;
	}

	applyPostProcessing(originalSource, settings.postProcessing);

	return originalSource.getFullText();
}

function isPostProcessingEnabled(postProcessing: IPostProcessingSettings) {
	return postProcessing.fixMissingImports || postProcessing.fixUnusedIdentifiers || postProcessing.formatCode || postProcessing.organizeImports;
}

function applyPostProcessing(source: tsMorph.SourceFile, postProcessing: IPostProcessingSettings) {
	if (postProcessing.fixMissingImports) {
		source.fixMissingImports();
	}

	if (postProcessing.fixUnusedIdentifiers) {
		source.fixUnusedIdentifiers();
	}

	if (postProcessing.organizeImports) {
		source.organizeImports();
	}

	if (postProcessing.formatCode) {
		source.formatText();
	}
}

export function transformSelectedNode(filePath: string, fileContents: string, code: string, selection: ISelection): ISelectedNode {
	try {
		const selectedNode = getSelectedNode(filePath, fileContents, selection);
		const inputNodeJson = JSON.stringify(serializeNode(selectedNode), null, "  ");
		try {
			transformNode(selectedNode, code, filePath);
			const outputNodeJson = JSON.stringify(serializeNode(selectedNode), null, "  ");
			return { inputNodeJson, outputNodeJson };
		} catch (e) {
			return { inputNodeJson, outputNodeJson: "" + e };
		}
	} catch (e) {
		return { inputNodeJson: "" + e, outputNodeJson: "" + e };
	}
}
