import * as tsMorph from 'ts-morph'

export function sourceFileToAst(filePath: string, fileContents: string): string {
	try {
		const project = new tsMorph.Project();
		const source = project.createSourceFile(filePath, fileContents, { overwrite: true });
		return JSON.stringify(source.getStructure(), null, "  ");
	} catch (e) {
		return e + "";
	}
}
