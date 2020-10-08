import { IMode } from "../model/model";

// Matches vscode color
// TODO: Import vscode library
export const DIVIDER_COLOR = "#424242";

export interface IExample {
    name: string;
    mode: IMode;
    code: string;
}



export const EXAMPLES = [
{
    name: "Rename package",
    mode: IMode.TransformAST,
    code: `
return renamePackage("../toPending", "pending");

function renamePackage(oldName, newName) {
    if (node.kindName !== "ImportDeclaration" || node.moduleSpecifier !== oldName) {
        return;
    }

    return { ...node, moduleSpecifier: newName };
}`,
},
{
    name: "Move imports between packages",
    mode: IMode.TransformAST,
    code: `
return moveImport("importName", "@package/old", "@package/new");

function moveImport(name, oldModule, newModule) {
    if (node.kindName !== "SourceFile") {
        return;
    }

    const newStatements = [];
    let addedImport = false;
    let seenImports = false;
    const newImport = { kind: 14, isTypeOnly: false, moduleSpecifier: newModule, namedImports: [{ kind: 15, name }] };

    node.statements.forEach(statement => {
        if (statement.kind !== 14) {
            if (seenImports && !addedImport) {
                newStatements.push(newImport);
                addedImport = true;
            }
            newStatements.push(statement);
            return;
        }
        seenImports = true;
        if (statement.moduleSpecifier === oldModule) {
            newStatements.push({ ...statement, namedImports: statement.namedImports.filter(i => i.name !== name) });
            return;
        }
        newStatements.push(statement);
    });

    return { ...node, statements: newStatements };
}
`,
},
{
    name: "Lower case all imports",
    mode: IMode.TransformCode,
    code: `
let lines = text.split("\\n").map(
  line => line.indexOf("import") === -1 ? line : line.toLowerCase()
);
return lines.filter(line => line !== undefined).join("\\n");
`
}
];
