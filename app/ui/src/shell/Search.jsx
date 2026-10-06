import { useMemo, useState } from 'react';
import { ComboBox, Input, Label, ListBox, ListBoxItem, Popover } from 'react-aria-components';

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
 * "Find a job, company or document": an accessible combobox over jobs,
 * companies, documents, pages and actions. Enter opens the result.
 */
export function Search() {
  const pipeline = useResource('pipeline');
  const portals = useResource('portals');
  const [text, setText] = useState('');

  const all = useMemo(() => {
    const rows = pipeline.data?.rows ?? [];
    const jobs = rows.map((r) => ({ id: `j-${r.id}`, label: jobName(r), href: `#/applications/${r.id}`, kind: 'Job' }));
    const docs = rows.flatMap((r) => [
      ...(r.pdf ? [{ id: `cv-${r.id}`, label: `Tailored CV · ${jobName(r)}`, href: `#/applications/${r.id}#documents`, kind: 'Document' }] : []),
      ...(r.cover ? [{ id: `cl-${r.id}`, label: `Cover letter · ${jobName(r)}`, href: `#/applications/${r.id}#documents`, kind: 'Document' }] : []),
    ]);
    const companies = (portals.data?.companies ?? []).map((c) => ({ id: `c-${c.index}`, label: c.name, href: '#/companies', kind: 'Company' }));
    return [...PLACES, ...jobs, ...companies, ...docs];
  }, [pipeline.data, portals.data]);

  const items = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    const words = q.split(/\s+/);
    return all.filter((i) => words.every((w) => i.label.toLowerCase().includes(w))).slice(0, 12);
  }, [all, text]);

  return (
    <ComboBox
      className="search"
      items={items}
      inputValue={text}
      onInputChange={setText}
      menuTrigger="input"
      allowsEmptyCollection
      onSelectionChange={(key) => {
        const hit = all.find((i) => i.id === key);
        if (!hit) return;
        setText('');
        navigate(hit.href);
      }}
    >
      <Label className="visually-hidden">Find a job, company or document</Label>
      <Input className="search-input" placeholder="Find a job, company or document…" />
      <Popover className="popover search-popover" placement="bottom end">
        <ListBox className="menu" renderEmptyState={() => <p className="menu-empty">Nothing matches “{text}”.</p>}>
          {(item) => (
            <ListBoxItem id={item.id} className="menu-item" textValue={item.label}>
              <span className="search-kind">{item.kind}</span> {item.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}
