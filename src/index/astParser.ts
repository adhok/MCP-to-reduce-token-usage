import { readFileSync } from "node:fs";
import { extname } from "node:path";
import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import Python from "tree-sitter-python";
import TypeScriptGrammars from "tree-sitter-typescript";

export type SupportedLanguage = "typescript" | "javascript" | "python";

export interface Symbol {
  name: string;
  kind: "function" | "class" | "method" | "interface" | "type" | "variable";
  startLine: number;
  endLine: number;
  signature: string;
}

export interface ParseResult {
  language: string;
  symbols: Symbol[];
  parsed: boolean;
}

export function detectLanguage(filePath: string): SupportedLanguage | null {
  switch (extname(filePath).toLowerCase()) {
    case ".ts":
    case ".tsx":
      return "typescript";
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return "javascript";
    case ".py":
      return "python";
    default:
      return null;
  }
}

function grammarFor(language: SupportedLanguage) {
  if (language === "typescript") return TypeScriptGrammars.typescript;
  if (language === "javascript") return JavaScript;
  return Python;
}

function bodyNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  return node.childForFieldName("body");
}

function nodeName(node: Parser.SyntaxNode): string | null {
  return node.childForFieldName("name")?.text
    ?? node.childForFieldName("property")?.text
    ?? null;
}

function signatureFor(node: Parser.SyntaxNode, source: string): string {
  const body = bodyNode(node);
  const end = body?.startIndex ?? node.endIndex;
  return source.slice(node.startIndex, end).trim().replace(/\s+/g, " ");
}

function addSymbol(symbols: Symbol[], node: Parser.SyntaxNode, source: string, kind: Symbol["kind"]): void {
  const name = nodeName(node);
  if (!name) return;
  symbols.push({
    name,
    kind,
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
    signature: signatureFor(node, source),
  });
}

function addClassMembers(symbols: Symbol[], node: Parser.SyntaxNode, source: string): void {
  const body = bodyNode(node);
  if (!body) return;
  for (const child of body.namedChildren) {
    if (["method_definition", "method_declaration", "function_definition", "async_function_definition"].includes(child.type)) {
      addSymbol(symbols, child, source, "method");
    } else if (child.type === "field_definition" && child.childForFieldName("value")?.type === "arrow_function") {
      addSymbol(symbols, child, source, "method");
    }
  }
}

function addObjectMembers(symbols: Symbol[], node: Parser.SyntaxNode, source: string): void {
  for (const child of node.namedChildren) {
    if (child.type === "method_definition") addSymbol(symbols, child, source, "method");
  }
}

function addFunctionValue(symbols: Symbol[], node: Parser.SyntaxNode, source: string): void {
  const value = node.childForFieldName("value");
  addSymbol(symbols, node, source, "variable");
  if (!value) return;
  if (value.type === "object") {
    addObjectMembers(symbols, value, source);
    return;
  }
  if (!["arrow_function", "function", "function_expression"].includes(value.type)) return;
  addSymbol(symbols, node, source, "function");
  const body = value.childForFieldName("body");
  if (body?.type === "object") addObjectMembers(symbols, body, source);
}

function addTopLevelNode(symbols: Symbol[], node: Parser.SyntaxNode, source: string): void {
  switch (node.type) {
    case "export_statement":
      for (const child of node.namedChildren) addTopLevelNode(symbols, child, source);
      return;
    case "function_declaration":
    case "generator_function_declaration":
    case "function_definition":
    case "async_function_definition":
      addSymbol(symbols, node, source, "function");
      return;
    case "lexical_declaration":
    case "variable_declaration":
      for (const child of node.namedChildren) {
        if (child.type === "variable_declarator") addFunctionValue(symbols, child, source);
      }
      return;
    case "class_declaration":
    case "class_definition":
      addSymbol(symbols, node, source, "class");
      addClassMembers(symbols, node, source);
      return;
    case "decorated_definition": {
      const definition = node.namedChildren.at(-1);
      if (definition?.type === "class_definition") {
        addSymbol(symbols, definition, source, "class");
        addClassMembers(symbols, definition, source);
      } else if (definition?.type === "function_definition") {
        addSymbol(symbols, definition, source, "function");
      }
      return;
    }
    case "interface_declaration":
      addSymbol(symbols, node, source, "interface");
      for (const child of node.namedChildren.flatMap((child) => child.namedChildren)) {
        if (["method_signature", "method_declaration"].includes(child.type)) addSymbol(symbols, child, source, "method");
      }
      return;
    case "type_alias_declaration":
      addSymbol(symbols, node, source, "type");
      return;
  }
}

export function parseFile(filePath: string): ParseResult {
  const language = detectLanguage(filePath);
  if (!language) return { language: "", symbols: [], parsed: false };

  try {
    const source = readFileSync(filePath, "utf8");
    const parser = new Parser();
    parser.setLanguage(grammarFor(language));
    const tree = parser.parse(source);
    if (!tree || tree.rootNode.hasError) return { language, symbols: [], parsed: false };

    const symbols: Symbol[] = [];
    for (const child of tree.rootNode.namedChildren) addTopLevelNode(symbols, child, source);
    return { language, symbols, parsed: true };
  } catch {
    return { language, symbols: [], parsed: false };
  }
}
