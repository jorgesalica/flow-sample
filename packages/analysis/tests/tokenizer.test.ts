import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/tokenizer';

describe('tokenize', () => {
  describe('empty / whitespace input', () => {
    it('returns no sections and zero tokens for an empty string', () => {
      const ast = tokenize('');
      expect(ast.sections).toEqual([]);
      expect(ast.totalTokens).toBe(0);
    });

    it('returns no sections for whitespace-only input', () => {
      const ast = tokenize('   \n  \t  \n\n   ');
      expect(ast.sections).toEqual([]);
      expect(ast.totalTokens).toBe(0);
    });
  });

  describe('single section / single line', () => {
    it('splits a line into word tokens', () => {
      const ast = tokenize('hello world foo');
      expect(ast.sections).toHaveLength(1);
      expect(ast.totalTokens).toBe(3);

      const [line] = ast.sections[0].lines;
      expect(line.map((t) => t.text)).toEqual(['hello', 'world', 'foo']);
    });

    it('collapses runs of internal whitespace between words', () => {
      const ast = tokenize('hello    world\t\tfoo');
      const [line] = ast.sections[0].lines;
      expect(line.map((t) => t.text)).toEqual(['hello', 'world', 'foo']);
      expect(ast.totalTokens).toBe(3);
    });

    it('trims leading and trailing whitespace from a line', () => {
      const ast = tokenize('   hello world   ');
      const [line] = ast.sections[0].lines;
      expect(line.map((t) => t.text)).toEqual(['hello', 'world']);
    });
  });

  describe('token ids', () => {
    it('assigns deterministic zero-padded sequential token ids', () => {
      const ast = tokenize('a b c');
      const ids = ast.sections[0].lines[0].map((t) => t.id);
      expect(ids).toEqual(['t_001', 't_002', 't_003']);
    });

    it('continues the token counter across lines and sections', () => {
      const ast = tokenize('a b\nc\n\nd');
      // section 1: line "a b" -> t_001,t_002 ; line "c" -> t_003
      // section 2: line "d" -> t_004
      expect(ast.totalTokens).toBe(4);
      expect(ast.sections[0].lines[0].map((t) => t.id)).toEqual(['t_001', 't_002']);
      expect(ast.sections[0].lines[1].map((t) => t.id)).toEqual(['t_003']);
      expect(ast.sections[1].lines[0].map((t) => t.id)).toEqual(['t_004']);
    });
  });

  describe('section ids and splitting', () => {
    it('splits sections on blank lines', () => {
      const ast = tokenize('verse line one\n\nsecond block');
      expect(ast.sections).toHaveLength(2);
    });

    it('treats a blank line with trailing whitespace as a section separator', () => {
      const ast = tokenize('block one\n   \nblock two');
      expect(ast.sections).toHaveLength(2);
    });

    it('assigns deterministic zero-padded sequential section ids', () => {
      const ast = tokenize('one\n\ntwo\n\nthree');
      expect(ast.sections.map((s) => s.id)).toEqual(['s_001', 's_002', 's_003']);
    });

    it('drops blank lines inside a section', () => {
      const ast = tokenize('first line\nsecond line');
      expect(ast.sections).toHaveLength(1);
      expect(ast.sections[0].lines).toHaveLength(2);
    });
  });

  describe('generic section types', () => {
    it('numbers sections without inferring a content domain', () => {
      const ast = tokenize('just some words\n\nsecond block');

      expect(ast.sections.map((section) => section.type)).toEqual(['Section 1', 'Section 2']);
    });

    it('treats musical markers as ordinary text', () => {
      const ast = tokenize('Verse 1\nsome words\n\n[Chorus]\nsing it');

      expect(ast.sections.map((section) => section.type)).toEqual(['Section 1', 'Section 2']);
    });
  });

  describe('structure integrity', () => {
    it('keeps totalTokens equal to the count of all tokens across the AST', () => {
      const ast = tokenize('Verse 1\nuno dos\n\nCoro\ntres');
      const counted = ast.sections
        .flatMap((s) => s.lines)
        .reduce((acc, line) => acc + line.length, 0);
      expect(ast.totalTokens).toBe(counted);
    });
  });
});
