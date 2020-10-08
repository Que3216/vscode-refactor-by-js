import * as tsMorph from 'ts-morph';
import { ISelection } from './model';

export function getSelectedNode(filePath: string, fileContents: string, selection: ISelection): tsMorph.Node<tsMorph.ts.Node> {
	const project = new tsMorph.Project();
	const originalSource = project.createSourceFile(filePath, fileContents, { overwrite: true });
	const startNode = originalSource.getDescendantAtPos(selection.start);
	const endNode = selection.end === undefined ? undefined : originalSource.getDescendantAtPos(selection.end);

	if (startNode === undefined) {
		throw new Error("Could not find node at position " + selection.start);
	}

	if (endNode === undefined) {
		return startNode;
	}

	const startNodeParents = new Set([startNode, ...getParents(startNode)]);
	let firstCommonParent = endNode;
	while (firstCommonParent.getParent() !== undefined && !startNodeParents.has(firstCommonParent)) {
		firstCommonParent = firstCommonParent.getParent()!; // should be defined, since checked in while loop clause
	}
	return firstCommonParent;
}

function getParents(node: tsMorph.Node<tsMorph.ts.Node>): Array<tsMorph.Node<tsMorph.ts.Node>> {
	const parents: Array<tsMorph.Node<tsMorph.ts.Node>> = [];
	while (node.getParent() !== undefined) {
		node = node.getParent()!; // should be defined, since checked in while loop clause
		parents.push(node);
	}
	return parents;
}
