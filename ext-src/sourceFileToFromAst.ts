import * as tsMorph from 'ts-morph'
import { Structures, ts } from 'ts-morph';

export function sourceFileToAst(filePath: string, fileContents: string): string {
	try {
        const project = new tsMorph.Project();
        const source = project.createSourceFile(filePath, fileContents, { overwrite: true });
		// TODO: special case 'block' node types, and recurse inside them to transform any statements
		return JSON.stringify(expandStructure(source.getStructure()), null, "  ");
	} catch (e) {
		return e + "";
	}
}

/**
 * Updated plan:
 * 
 * {
      "name": "matchesSpec",
      "statements": [
        "if (spec.propertyTypeIds && !spec.propertyTypeIds.some(p => p === props.property.type.typeId)) {\n    return false;\n}",
        "if (spec.objectTypeId && spec.objectTypeId !== props.objectTypeId) {\n    return false;\n}",
        "if (spec.renderContext && spec.renderContext !== props.renderContext) {\n    return false;\n}",
        "if (spec.size && spec.size !== props.size) {\n    return false;\n}",
        "if (\n    spec.typeclasses &&\n    !spec.typeclasses.some(p => props.property.type.typeClasses.some(tc => tc.kind === p || tc.asString() === p))\n) {\n    return false;\n}",
        "return true;"
      ],
      "parameters": [
        {
          "name": "props",
          "type": "ValueRendererAppliesOpts",
          "isReadonly": false,
          "decorators": [],
          "hasQuestionToken": false,
          "kind": 28,
          "isRestParameter": false
        },
        {
          "name": "spec",
          "type": "RendererAppliesSpecifier",
          "isReadonly": false,
          "decorators": [],
          "hasQuestionToken": false,
          "kind": 28,
          "isRestParameter": false
        }
      ],
      "typeParameters": [],
      "docs": [],
      "isExported": true,
      "isDefaultExport": false,
      "hasDeclareKeyword": false,
      "isGenerator": false,
      "isAsync": false,
      "kind": 11,
      "overloads": []
    }
 * 
 * Serialize:
 *  - Do sourceFile.getStructure()
 *  - Then expand this structure --
 *      - for known 'kinds' render the statement strings one by one into a source file, as custom structures (e.g. if statement)
 *      - and parse this source file to create a custom structure
 * 
 * Deserialize:
 *  - Receive modified structure
 *  - Then contract this structure -- for each of the known 'kinds' re-create the tsNodes from the JSON structure, and render them back to a string
 *    by creating a micro source file
 */

type AllStructures = string | tsMorph.WriterFunction | Structures | AdditionalStructures

/* Added strucutres */
type AdditionalStructures = IfStatementStructure;

enum ExtendedStructureKind {
    IfStatement = 1001,
}

interface IfStatementStructure {
    kind: ExtendedStructureKind.IfStatement;
    expression: string;
    thenStatement: AllStructures[];
    elseStatement: string | undefined;
}

function expandStructure(structure: string | tsMorph.WriterFunction | Structures): AllStructures {
    if (typeof structure === "function") {
        return structure;
    }
    if (typeof structure === "string") {
        const project = new tsMorph.Project();
        const source = project.createSourceFile("temp.tsx", structure, { overwrite: true });
        const node = source.getStatementsWithComments()[0];
        if (node && tsMorph.Node.isIfStatement(node)) {
            const elseStatement = node.getElseStatement();
            return {
                kind: 1001,
                expression: node.getExpression().getFullText(),
                thenStatement: (node.getThenStatement() as tsMorph.Block).getStatementsWithComments().map(s => expandStructure(s.getFullText())),
                elseStatement: elseStatement !== undefined ? elseStatement.getFullText() : undefined,
            };
        }
        return structure;
    }
    if (structure.kind === tsMorph.StructureKind.SourceFile || structure.kind === tsMorph.StructureKind.Function) {
        return {
            ...structure,
            statements: typeof structure.statements === "object" ?
                structure.statements.map(expandStructure) as Array<string | tsMorph.WriterFunction | tsMorph.StatementStructures>
                : structure.statements,
        }
    }
    if (structure.kind === tsMorph.StructureKind.Class) {
        return {
            ...structure,
            methods: structure.methods === undefined ? structure.methods : structure.methods.map(method => ({
                ...method,
                statements:  typeof method.statements === "object" ?
                    method.statements.map(expandStructure) as Array<string | tsMorph.WriterFunction | tsMorph.StatementStructures>
                    : method.statements,
            })),
        };
    }
    return structure;
}

function renderStructure(structure: string | tsMorph.WriterFunction | Structures) {
    const project = new tsMorph.Project();
    const source = project.createSourceFile("temp.tsx", structure as tsMorph.SourceFileStructure, { overwrite: true });
    return source.getFullText();
}

function collapseStructure(structure: AllStructures): string | tsMorph.WriterFunction | Structures {
    if (typeof structure === "function") {
        return structure;
    }
    if (typeof structure === "string") {
        return structure;
    }
    if (structure.kind === ExtendedStructureKind.IfStatement) {
        const then = structure.thenStatement.map(s => renderStructure(collapseStructure(s))).join("\n");
        if (structure.elseStatement !== undefined) {
            return `if (${structure.expression}) {${then}} else {${structure.elseStatement}}`;
        }
        return `if (${structure.expression}) {${then}}`;
    }
    if (structure.kind === tsMorph.StructureKind.SourceFile || structure.kind === tsMorph.StructureKind.Function) {
        return {
            ...structure,
            statements: typeof structure.statements === "object" ?
                structure.statements.map(collapseStructure) as Array<string | tsMorph.WriterFunction | tsMorph.StatementStructures>
                : structure.statements,
        }
    }
    if (structure.kind === tsMorph.StructureKind.Class) {
        return {
            ...structure,
            methods: structure.methods === undefined ? structure.methods : structure.methods.map(method => ({
                ...method,
                statements:  typeof method.statements === "object" ?
                    method.statements.map(collapseStructure) as Array<string | tsMorph.WriterFunction | tsMorph.StatementStructures>
                    : method.statements,
            })),
        };
    }
    return structure;
}

// function astToNode(ast: IASTNode): tsMorph.Node {

// }

export function astToSourceFile(filePath: string, originalFileContents: string, ast: string | tsMorph.WriterFunction | Structures | AdditionalStructures): string {
	try {
		const project = new tsMorph.Project();
        const originalSource = project.createSourceFile(filePath, originalFileContents, { overwrite: true });
        // originalSource.insertStatements
        originalSource.set(collapseStructure(ast) as tsMorph.SourceFileStructure);
        return originalSource.getFullText();
		// return ast.map(astToNode).map(n => n.getFullText).join("\n");
	} catch (e) {
		return e + "";
	}
}