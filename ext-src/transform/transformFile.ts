import * as tsMorph from 'ts-morph'
import { getSelectedNode } from '../getSelectedNode';
import { IFileContents, IMode, ISelectedNode, ISelection } from '../model';
import { sourceFileToAst } from '../sourceFileToAst';
import { serializeNode, transformNode } from './transformNode';

export function transformFileForPreview(filePath: string, fileContents: string, code: string, mode: IMode): IFileContents {
	try {
		const transformedCode = transformFile(filePath, fileContents, code, mode);
		return { code: transformedCode, ast: sourceFileToAst(filePath, transformedCode) };
	} catch (e) {
		return { code: "" + e, ast: "" + e };
	}
}

export function transformFile(filePath: string, fileContents: string, code: string, mode: IMode): string {
	if (mode === IMode.TransformCode) {
		const stringifiedContents = JSON.stringify( { text: fileContents, path: filePath } );
		const fullCode = `let data = ${stringifiedContents}; function replace(text, path) { ${code} }; replace(data.text, data.path);`
		return eval(fullCode);
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

	return originalSource.getFullText();
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
