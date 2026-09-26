// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { openModal, parseUpdateLog, updateLogHTML } from '../src/ui/modal';
import { RULES } from '../src/ui/help';
import type { PlayableId } from '../src/ui/app';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('parseUpdateLog', () => {
  it('parses date sections with items', () => {
    const entries = parseUpdateLog('# 업데이트 내역\n\n## 2026-09-21\n\n- 첫 번째\n- 두 번째\n\n## 2026-09-20\n\n- 예전 것\n');
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ date: '2026-09-21', items: ['첫 번째', '두 번째'] });
  });
  it('skips sections without items', () => {
    expect(parseUpdateLog('## 2026-09-21\n\n## 2026-09-20\n\n- 있음\n')).toHaveLength(1);
  });
  it('escapes HTML in output', () => {
    const html = updateLogHTML([{ date: '2026-09-21', items: ['<script>alert(1)</script>'] }]);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('openModal', () => {
  it('opens dialog and focuses close button', () => {
    const opener = document.createElement('button');
    opener.textContent = '열기';
    document.body.appendChild(opener);
    opener.focus();
    openModal({ title: '제목', bodyHTML: '<p>본문</p>' });
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.textContent).toContain('본문');
    expect(document.activeElement?.textContent).toBe('닫기');
  });
  it('closes on Escape and returns focus', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    openModal({ title: '제목', bodyHTML: '<p>본문</p>' });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(document.querySelector('[role="dialog"]')).toBe(null);
    expect(document.activeElement).toBe(opener);
  });
  it('closes on overlay click and close button', () => {
    openModal({ title: '제목', bodyHTML: '<p>본문</p>' });
    const overlay = document.querySelector('.modal-overlay') as HTMLElement;
    overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(document.querySelector('[role="dialog"]')).toBe(null);
    openModal({ title: '제목', bodyHTML: '<p>본문</p>' });
    (document.querySelector('.modal-close') as HTMLElement).click();
    expect(document.querySelector('[role="dialog"]')).toBe(null);
  });
});

describe('RULES', () => {
  it('covers all twelve games', () => {
    const ids: PlayableId[] = [
      'fruit', 'squat', 'math', 'abc', 'star', 'balloon',
      'zombie', 'dance', 'simon', 'yoga', 'duo', 'recycle'
    ];
    for (const id of ids) {
      expect(RULES[id].name.length).toBeGreaterThan(0);
      expect(RULES[id].steps.length).toBeGreaterThanOrEqual(2);
    }
  });
});
