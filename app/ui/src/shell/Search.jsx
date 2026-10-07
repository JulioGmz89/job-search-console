import { useId, useMemo, useRef, useState } from 'react';

import { useResource } from '../data.js';
import { jobName } from '../lib/labels.js';
import { navigate } from './router.jsx';

/** Places and actions the search finds by name (ia.md §1). */
const PLACES = [
  { id: 'p-today', label: 'Today', href: '#/today', kind: 'Page' },
  { id: 'p-apps', label: 'Applications', href: '#/applications', kind: 'Page' },
  { id: 'p-review', label: 'To review', href: '#/to-review', kind: 'Page' },
  { id: 'p-scan', label: 'Check for new openings', href: '#/to-review', kind: 'Action' },
  { id: 'p-companies', label: 'Companies you follow', href: '#/companies', kind: 'Page' },
  { id: 'p-follow', label: 'Follow a company', href: '#/companies', kind: 'Action' },
  { id: 'p-learn', label: 'Skills to learn next', href: '#/skills/learn', kind: 'Page' },
  { id: 'p-cv', label: 'My CV', href: '#/my-cv/content', kind: 'Page' },
  { id: 'p-profile', label: 'Profile', href: '#/my-cv/profile', kind: 'Page' },
  { id: 'p-design', label: 'CV design', href: '#/my-cv/design', kind: 'Page' },
  { id: 'p-rules', label: 'Writing rules', href: '#/my-cv/writing', kind: 'Page' },
  { id: 'p-activity', label: 'Activity', href: '#/activity', kind: 'Page' },
  { id: 'p-workspace', label: 'Workspace', href: '#/workspace', kind: 'Page' },
  { id: 'p-help', label: 'Help', href: '#/help', kind: 'Page' },
];

/**
 * "Find a job, company or document" (ia.md §1): a combobox over jobs,
 * companies, documents, pages and actions. Enter opens the result.
 *
 * Written to the ARIA 1.2 combobox pattern by hand rather than with React
 * Aria's ComboBox, which hides the rest of the page (aria-hidden) while its
 * list is open; axe reports that as aria-hidden-focus (serious). Focus never
 * leaves the input: the active option is announced through
 * aria-activedescendant.
 */
export function Search() {
  const pipeline = useResource('pipeline');
  const portals = useResource('portals');
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Below 960 px the field folds into a button (ia.md §1 "Reflow").
  const [unfolded, setUnfolded] = useState(false);
  const input = useRef(null);
  const listId = useId();

  const all = useMemo(() => {
    const rows = pipeline.data?.rows ?? [];
    const jobs = rows.map((r) => ({ id: `j-${r.id}`, label: jobName(r), href: `#/applications/${r.id}`, kind: 'Job', also: r.report?.url ?? '' }));
    const docs = rows.flatMap((r) => [
      ...(r.pdf ? [{ id: `cv-${r.id}`, label: `Tailored CV · ${jobName(r)}`, href: `#/applications/${r.id}#documents`, kind: 'Document' }] : []),
      ...(r.cover ? [{ id: `cl-${r.id}`, label: `Cover letter · ${jobName(r)}`, href: `#/applications/${r.id}#documents`, kind: 'Document' }] : []),
    ]);
    const companies = (portals.data?.companies ?? []).map((c) => ({ id: `c-${c.index}`, label: c.name, href: '#/companies', kind: 'Company' }));
    return [...PLACES, ...jobs, ...companies, ...docs];
  }, [pipeline.data, portals.data]);

  const items = useMemo(() => {
    const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    // A pasted posting link finds its job too (W8-T2-01).
    return all.filter((i) => words.every((w) => `${i.label} ${i.also ?? ''}`.toLowerCase().includes(w))).slice(0, 12);
  }, [all, text]);

  const shown = open && text.trim() !== '';
  const choose = (item) => {
    if (!item) return;
    setText('');
    setOpen(false);
    navigate(item.href);
  };
  const optionId = (i) => `${listId}-o${i}`;

  return (
    <div className="search" data-unfolded={unfolded}>
      <button
        type="button"
        className="search-toggle"
        aria-expanded={unfolded}
        onClick={() => {
          setUnfolded((u) => !u);
          setTimeout(() => input.current?.focus(), 0);
        }}
      >
        Search
      </button>
      <label className="visually-hidden" htmlFor={`${listId}-input`}>
        Find a job, company or document
      </label>
      <input
        ref={input}
        id={`${listId}-input`}
        className="search-input"
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={listId}
        aria-activedescendant={shown && items.length ? optionId(active) : undefined}
        placeholder="Find a job, company or document…"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, Math.max(items.length - 1, 0)));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && shown) {
            e.preventDefault();
            choose(items[active]);
          } else if (e.key === 'Escape') {
            if (shown) setOpen(false);
            else if (text) setText('');
            else setUnfolded(false);
          }
        }}
      />
      <ul id={listId} role="listbox" aria-label="Results" className="popover search-popover menu" hidden={!shown}>
        {items.map((item, i) => (
          <li
            key={item.id}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            className="menu-item"
            data-focused={i === active ? true : undefined}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(item)}
          >
            <span className="search-kind">{item.kind}</span> {item.label}
          </li>
        ))}
        {shown && !items.length ? (
          <li role="option" aria-selected="false" aria-disabled="true" className="menu-empty">
            Nothing matches “{text}”.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
