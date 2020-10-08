export interface IFileContents {
  ast: string;
  code: string;
}
  
export interface ISelection {
  start: number | undefined;
  end: number | undefined;
}
  
export interface ISelectedNode {
  inputNodeJson: string;
  outputNodeJson: string;
}

export type IMode = "transform-code" | "transform-ast";

export const IMode = {
  TransformCode: "transform-code" as "transform-code",
  TransformAST: "transform-ast" as "transform-ast"
};

export interface ISettings {
  mode: IMode;
}