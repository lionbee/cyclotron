import * as vscode from 'vscode';
import { Node, parse, Program } from 'acorn';
import { simple as walkSimple, findNodeAt } from 'acorn-walk';

interface FunctionComplexity {
    complexity: number;
    start_line: number;
    end_line: number;
}

export function activate(context: vscode.ExtensionContext) {
    let activeEditor = vscode.window.activeTextEditor;

    console.log('Cyclotron" is now active!');

    // const complexityDisposable = vscode.commands.registerCommand('cyclotron.calculateComplexity', () => {
    //     calculateComplexity();
    // });

    // context.subscriptions.push(complexityDisposable);

    // Function to update the function decoration based on cyclomatic complexity
    async function updateFunctionDecoration() {

        if (!activeEditor) {
            return;
        }

        const functionComplexity = await calculateComplexityForActiveFunction(activeEditor);
        if (functionComplexity) {
            const decorationType = getDecorationTypeForComplexity(functionComplexity.complexity);

            // Create a decoration range that spans the entire function
            const range = new vscode.Range(functionComplexity.start_line, 0, functionComplexity.end_line, 100);

            const decorationOptions: vscode.DecorationOptions[] = [{ range: range, hoverMessage: `Function complexity: ${functionComplexity.complexity}` }];
            activeEditor.setDecorations(decorationType, decorationOptions);
        }
    }

    // Listen for when the active text editor changes
    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            updateFunctionDecoration();
        }
    }, null, context.subscriptions);

    // Listen for document changes
    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            updateFunctionDecoration();
        }
    }, null, context.subscriptions);

    // Initial update
    if (activeEditor) {
        updateFunctionDecoration();
    }
}

export function deactivate() { }

function calculateComplexityForActiveFunction(editor: vscode.TextEditor): FunctionComplexity | null {
    // const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No active editor.');
        return null;
    }

    const document = editor.document;
    const position = editor.selection.active;
    const text = document.getText();
    const offset = document.offsetAt(position);

    try {
        const ast = parse(text, { ecmaVersion: 2020, sourceType: "module", locations: true });
        const node = findCurrentFunctionNode(ast, offset);

        if (node) {
            return calculateFunctionComplexity(node);
        }
    } catch (error: unknown) {
        // vscode.window.showErrorMessage('Error parsing JavaScript: ' + (error as Error).message);
    }
    return null;
}

function findCurrentFunctionNode(ast: Program, offset: number): Node | null {
    let currentFunctionNode = null;

    walkSimple(ast, {
        Function(node, _state) {
            if (node.start <= offset && node.end >= offset) {
                currentFunctionNode = node;
            }
        }
    });

    return currentFunctionNode;
}

function calculateFunctionComplexity(node: Node): FunctionComplexity | null {
    let complexity = 1;

    walkSimple(node, {
        IfStatement() { complexity++; },
        ForStatement() { complexity++; },
        WhileStatement() { complexity++; },
        DoWhileStatement() { complexity++; },
        SwitchCase() { complexity++; },
        LogicalExpression() { complexity++; },
    });

    return {
        start_line: node?.loc?.start.line - 1,
        end_line: node?.loc?.end.line,
        complexity,
    };
}

function getDecorationTypeForComplexity(complexity: number): vscode.TextEditorDecorationType {
    // Define the base red color
    const baseRed = 244;
    const baseGreen = 67;
    const baseBlue = 54;

    // Define the complexity range where color fading starts and ends
    const config = vscode.workspace.getConfiguration('Cyclotron');
    const startComplexity = config.get<number>('startComplexity', 11);
    const maxComplexity = config.get<number>('maxComplexity', 51);
    const complexityRange = maxComplexity - startComplexity;

    // Adjust the darken factor based on the new complexity range
    const maxDarkenAmount = 180; // This is the maximum amount the color can darken
    let darkenFactor = complexity > startComplexity ? (complexity - startComplexity) / complexityRange : 0;
    darkenFactor = Math.min(darkenFactor, 1); // Ensure darkenFactor does not exceed 1

    // Calculate the new color based on complexity. Ensure it doesn't go below the minimum allowed values.
    let newRed = baseRed - (maxDarkenAmount * darkenFactor);
    let newGreen = baseGreen - (maxDarkenAmount * darkenFactor / 2);
    let newBlue = baseBlue - (maxDarkenAmount * darkenFactor / 2);

    // Ensure the color values do not go below 0
    newRed = Math.max(newRed, 0);
    newGreen = Math.max(newGreen, 0);
    newBlue = Math.max(newBlue, 0);

    // Create a new decoration type with the calculated color
    return vscode.window.createTextEditorDecorationType({
        backgroundColor: `rgba(${newRed}, ${newGreen}, ${newBlue}, 0.3)`,
    });
}

