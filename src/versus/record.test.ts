// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { emptyRecord, loadRecord, saveResult, recordLabel } from './record';

beforeEach(() => {
  localStorage.clear();
});

describe('versus record', () => {
  it('처음에는 0승 0무', () => {
    expect(loadRecord('versus-fruit')).toEqual(emptyRecord());
  });
  it('승패를 누적한다 (종목별로 따로)', () => {
    saveResult('versus-fruit', 'p1');
    saveResult('versus-fruit', 'p1');
    saveResult('versus-fruit', 'p2');
    saveResult('versus-tug', 'p2');
    expect(loadRecord('versus-fruit')).toEqual({ p1: 2, p2: 1, draw: 0 });
    expect(loadRecord('versus-tug')).toEqual({ p1: 0, p2: 1, draw: 0 });
  });
  it('무승부도 센다', () => {
    saveResult('versus-math', 'draw');
    expect(loadRecord('versus-math').draw).toBe(1);
  });
  it('깨진 저장값은 기본값으로 읽는다', () => {
    localStorage.setItem('skelversus:record:versus-fruit', '{깨짐');
    expect(loadRecord('versus-fruit')).toEqual(emptyRecord());
  });
  it('전적 문구를 만든다', () => {
    expect(recordLabel({ p1: 2, p2: 1, draw: 0 })).toBe('지금까지 전적 — P1 2승 · P2 1승 · 무 0');
  });
});
