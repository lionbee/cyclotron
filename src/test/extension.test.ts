// Import necessary modules and mock them as needed
import * as vscode from 'vscode';
import { activate, ComplexityCodeLensProvider, getParserForLanguage } from '../extension'; // Adjust the import path as necessary
import { parse as jsParse } from 'acorn';
import { parse as tsParse } from '@typescript-eslint/typescript-estree';

jest.mock('vscode');

describe('Extension Tests', () => {
	describe('activate function', () => {
		it('should register ComplexityCodeLensProvider for supported languages', () => {
			const context = { subscriptions: { push: jest.fn() } } as unknown as vscode.ExtensionContext;
			activate(context);
			expect(context.subscriptions.push).toHaveBeenCalledTimes(2); // Assuming 2 supported languages
			// Further checks can be added to ensure correct provider is registered
		});
	});

	describe('ComplexityCodeLensProvider', () => {
		let provider: ComplexityCodeLensProvider;
		let mockDocument: vscode.TextDocument;

		beforeEach(() => {
			provider = new ComplexityCodeLensProvider();
			mockDocument = { languageId: 'javascript', getText: () => '' } as unknown as vscode.TextDocument;
			// Mock more properties and methods as needed
		});

		it('should provide CodeLenses with correct complexity and range', async () => {
			// This test assumes calculateComplexitiesForDocument is implemented and mockable
			// Mock calculateComplexitiesForDocument to return a known complexity for testing
			const complexities = [{ complexity: 5, start_line: 1, end_line: 10 }];
			// Mock implementation or use jest.fn() to simulate response
			const lenses = await provider.provideCodeLenses(mockDocument, {} as vscode.CancellationToken);
			expect(lenses).toHaveLength(1);
			expect(lenses[0].range.start.line).toBe(1);
			expect(lenses[0].command?.title).toContain('Complexity: 5');
		});
	});

	describe('getParserForLanguage function', () => {
		it('should return the correct parser for JavaScript', () => {
			expect(getParserForLanguage('javascript')).toBe(jsParse);
		});

		it('should return the correct parser for TypeScript', () => {
			expect(getParserForLanguage('typescript')).toBe(tsParse);
		});

		it('should return null for unsupported languages', () => {
			expect(getParserForLanguage('python')).toBeNull();
		});
	});
});