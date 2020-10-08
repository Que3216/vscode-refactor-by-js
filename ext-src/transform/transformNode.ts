
import * as tsMorph from 'ts-morph';
import { isDeepEqual } from './deepEqual';
import { findPathToPackageRoot } from './findPathToPackageRoot';

export function transformNode(node: tsMorph.Node<tsMorph.ts.Node>, code: string, path: string): void {
	const set = (node as any)["set"];
	const serialized = serializeNode(node);
	const result = evalTransformNode(serialized, code, path);

	if (!result || isDeepEqual(result, serialized)) {
		return;
	}

	if (result.kind) {
		if (set !== undefined) {
			set.bind(node)(result);
		}
		return;
	}

	const oldFullText = node.getFullText();
	if (result.fullText && result.fullText !== oldFullText) {
		node.replaceWithText(result.fullText);
		return;
	}

	const oldText = node.getText();
	if (result.text && result.text !== oldText) {
		node.replaceWithText(oldFullText.replace(oldText, result.text));
		return;
	}
}

function evalTransformNode(node: any, code: string, path: string): any {
	const stringifiedContents = JSON.stringify( { node, path, pathToPackageRoot: findPathToPackageRoot(path) } );
	const fullCode = `let data = ${stringifiedContents}; function replace(node, path, pathToPackageRoot) { ${code} }; replace(data.node, data.path, data.pathToPackageRoot);`
	return eval(fullCode);
}

export function serializeNode(node: tsMorph.Node<tsMorph.ts.Node>): any {
	const structure = getStructure(node);

	if (structure !== undefined) {
		return structure;
	} else {
		return { kindName: node.getKindName(), fullText: node.getFullText(), text: node.getText() };
	}
}

function getStructure(node: tsMorph.Node<tsMorph.ts.Node>): any | undefined {
	const getStructure = (node as any)["getStructure"];

	if (getStructure !== undefined) {
		return { ...getStructure.bind(node)(), kindName: node.getKindName() };
	} else {
		return undefined;
	}
}
