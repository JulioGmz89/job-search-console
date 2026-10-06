import { PageHead } from '../shell/router.jsx';
import { ContentSection } from './mycv/Content.jsx';
import { DesignSection } from './mycv/Design.jsx';
import { ProfileSection } from './mycv/Profile.jsx';
import { WritingSection } from './mycv/Writing.jsx';

const SECTIONS = [
  { id: 'content', label: 'Content', Section: ContentSection },
  { id: 'profile', label: 'Profile', Section: ProfileSection },
  { id: 'design', label: 'Design', Section: DesignSection },
  { id: 'writing', label: 'Writing rules', Section: WritingSection },
];

/**
 * My CV (ia.md §2.7): the CV, the profile, how the CV looks and how the
 * assistant writes, as four sections with their own addresses.
 */
export function MyCvPage({ params }) {
  const current = SECTIONS.find((s) => s.id === params.section) ?? SECTIONS[0];
  const { Section } = current;
  return (
    <>
      <PageHead title="My CV" lead="Your CV, your profile, how your CV looks and how the assistant writes." />
      <nav className="subnav" aria-label="My CV sections">
        <ul>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#/my-cv/${s.id}`} aria-current={s.id === current.id ? 'page' : undefined}>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <h2 className="visually-hidden">{current.label}</h2>
      <Section />
    </>
  );
}
