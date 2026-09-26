import './modal.css';

export interface UpdateEntry {
  date: string;
  items: string[];
}

// docs/UPDATELOG.md를 파싱한다. `## 날짜` 섹션 + `- ` 항목만 읽는다.
export function parseUpdateLog(md: string): UpdateEntry[] {
  const entries: UpdateEntry[] = [];
  let current: UpdateEntry | null = null;
  for (const line of md.split('\n')) {
    const date = line.match(/^##\s+(.+)\s*$/);
    if (date) {
      current = { date: date[1].trim(), items: [] };
      entries.push(current);
      continue;
    }
    const item = line.match(/^-\s+(.+)\s*$/);
    if (item && current) current.items.push(item[1].trim());
  }
  return entries.filter((e) => e.items.length > 0);
}

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function updateLogHTML(entries: UpdateEntry[]): string {
  return entries
    .map(
      (e) =>
        `<section class="log-day"><h3>${esc(e.date)}</h3><ul>` +
        e.items.map((i) => `<li>${esc(i)}</li>`).join('') +
        `</ul></section>`
    )
    .join('');
}

export interface ModalOpts {
  title: string;
  bodyHTML: string;
}

// 공용 모달: 오버레이 클릭·Esc로 닫히고, 포커스를 호출자로 되돌린다.
// WCAG 2.1 2.1.1/2.4.3: 네이티브 <button> 닫기 + 포커스 진입·복원.
export function openModal(opts: ModalOpts): () => void {
  const opener = document.activeElement as HTMLElement | null;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">` +
    `<div class="modal-head"><h2 id="modal-title">${esc(opts.title)}</h2>` +
    `<button type="button" class="modal-close">닫기</button></div>` +
    `<div class="modal-body">${opts.bodyHTML}</div></div>`;
  const close = (): void => {
    overlay.remove();
    document.removeEventListener('keydown', onKey, true);
    opener?.focus?.();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.modal-close')?.addEventListener('click', close);
  document.addEventListener('keydown', onKey, true);
  document.body.appendChild(overlay);
  (overlay.querySelector('.modal-close') as HTMLElement | null)?.focus();
  return close;
}
