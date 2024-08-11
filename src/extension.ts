import * as vscode from 'vscode';
import { Node, Program } from 'estree';
import { parse as jsParse } from 'acorn';
import { parse as tsParse } from '@typescript-eslint/typescript-estree';

interface FunctionComplexity {
    complexity: number;
    start_line: number;
    end_line: number;
}

const supportedLanguages = ['javascript', 'typescript'];

export function activate(context: vscode.ExtensionContext) {
    let provider = new ComplexityCodeLensProvider();
    supportedLanguages.forEach(lang => {
        context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: lang }, provider));
    });
}

export class ComplexityCodeLensProvider implements vscode.CodeLensProvider {
    public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        // Placeholder for actual complexity calculation logic
        // For demonstration, we'll assume a function that asynchronously calculates complexity for all functions in a document
        return calculateComplexitiesForDocument(document).then(complexities => {
            return complexities.map(func => {
                let range = new vscode.Range(func.start_line, 0, func.start_line, 0);
                let command: vscode.Command = {
                    title: `Complexity: ${func.complexity}`, // Display complexity in the CodeLens
                    command: '', // Optionally, specify a command to execute on click
                    arguments: [] // Pass any arguments to the command if needed
                };
                return new vscode.CodeLens(range, command);
            });
        });
    }
}

type ParserFunc = typeof jsParse | typeof tsParse;

export function getParserForLanguage(language: string): ParserFunc | null {
    switch (language) {
        case 'javascript':
            return jsParse;
        case 'typescript':
            return tsParse;
    }
    return null;
}

function calculateDocumentComplexities(code: string, parse: ParserFunc): FunctionComplexity[] {
    const ast = (parse(code, { ecmaVersion: 2020, sourceType:"script", loc: true, locations: true }) as Program);
    const complexities: FunctionComplexity[] = [];

    function calculateComplexity(node: Node): FunctionComplexity {
        let complexity = 1; // Base complexity for a function

        function traverse(node: Node) {
            switch (node.type) {
                case "IfStatement":
                case "ForStatement":
                case "WhileStatement":
                case "DoWhileStatement":
                case "SwitchCase":
                    complexity++;
                    break;
            }

            for (const key in node) {
                if (node.hasOwnProperty(key)) {
                    const child = (node as any)[key];
                    if (Array.isArray(child)) {
                        child.forEach(traverse);
                    } else if (typeof child === "object" && child !== null) {
                        traverse(child);
                    }
                }
            }
        }

        traverse(node); // Start traversing from the body of the function
        return {
            start_line: (node.loc? node.loc.start.line - 1 : -1),
            end_line: (node.loc? node.loc.end.line - 1 : -1),
            complexity,
        };
    }

    function traverseAST(node: Node) {
        if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") {
            complexities.push(calculateComplexity(node));
        }

        for (const key in node) {
            if (node.hasOwnProperty(key)) {
                const child = (node as any)[key];
                if (Array.isArray(child)) {
                    child.forEach(traverseAST);
                } else if (typeof child === "object" && child !== null) {
                    traverseAST(child);
                }
            }
        }
    }

    traverseAST(ast); // Start traversing the AST
    return complexities;
}

function calculateComplexitiesForDocument(document: vscode.TextDocument): Promise<FunctionComplexity[]> {
    return new Promise((resolve, _reject) => {
        const code = document.getText();
        const parse = getParserForLanguage(document.languageId);
        if (!parse) {
            resolve([]);
            return;
        }
        const complexities = calculateDocumentComplexities(code, parse);
        resolve(complexities);
    });
}

export function deactivate() { }
