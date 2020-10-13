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
    name: "Available variables",
    mode: IMode.TransformCode,
    code: `return JSON.stringify({ text, path, pathToPackageRoot }, null, "  ");`,
},
{
    name: "Add/remove imports",
    mode: IMode.TransformCode,
    code: `
text = addImport(text, "myObject", pathToPackageRoot + "/myFile");
text = removeImport(text, "myOldObject", "my-package");
text = text.replace(/myOldObject/g, "myObject");
return text;

function addImport(text, name, module) {
    const lines = text.split("\\n");
    const newLines = [];
    const indexOfLastImport = lines.lastIndexOf([...lines].reverse().find(line => line.match(/} from "[^"]*";/)));
    let importAdded = false;
    lines.forEach((line, index) => {
        if (isImportOf(line, name, module)) {
            importAdded = true;
        } else if (index > indexOfLastImport && !importAdded) {
            newLines.push(\`import { \${name} } from "\${module}";\`);
            importAdded = true;
        }
        newLines.push(line);
    });
    return newLines.join("\\n");
}

function removeImport(text, name, module) {
    const lines = text.split("\\n");
    const newLines = [];
    lines.forEach(line => {
        if (!isImportOf(line, name, module)) {
            newLines.push(line);
            return;
        }
        if (line.indexOf(",") === -1) {
            return;
        }
        newLines.push(line.replace(\`\${name}, \`, "").replace(\`, \${name}\`, ""));
    });
    return newLines.join("\\n");
}

function isImportOf(line, name, module) {
    return line.startsWith("import ") && line.indexOf(\`from "\${module}";\`) > -1 && (line.indexOf(\` \${name} \`) > -1 || line.indexOf(\`\${name}, \`) > -1);
}
`,
},
{
    name: "Rename package [AST]",
    mode: IMode.TransformAST,
    code: `
return renamePackage("@package/old", "@package/new");

function renamePackage(oldName, newName) {
    if (node.kindName !== "ImportDeclaration" || node.moduleSpecifier !== oldName) {
        return;
    }

    return { ...node, moduleSpecifier: newName };
}`,
},
{
    name: "Move imports between packages [AST]",
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
