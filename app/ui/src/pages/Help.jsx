import { PageHead } from '../shell/router.jsx';

/**
 * Help (ia.md §2.10): short topics in a job seeker's words, linked from the
 * "?" links beside the controls they explain.
 */
export const TOPICS = {
  fit: {
    title: 'How the fit is worked out',
    body: [
      'The assistant reads the posting and compares it with your CV and profile, part by part: the role, how your CV matches, the level, the pay, how to tailor your CV, and how to prepare for interviews.',
      'It scores the match from 1 to 5. 4 and up is a strong fit; 3 to 4 is worth a look; under 3 usually means skip. The recommendation (Apply, Consider, Skip) follows from the score and from any hard stops, such as a location you can’t work from.',
    ],
  },
  costs: {
    title: 'What a check costs, and why it takes minutes',
    body: [
      'Fit checks, tailored CVs and cover letters are written by Claude Code on your computer, using your own Claude plan. Each takes 2–5 minutes, because the assistant reads the posting, your CV and your writing rules.',
      'Up to 2 run at once; more wait their turn. Checking for new openings, laying out a PDF in another design and the screening check use no AI and take seconds.',
    ],
  },
  failures: {
    title: 'Why something can fail, and what to do',
    body: [
      'Most failures are temporary: a slow posting page, a session that ended early, or a job board that was briefly down. Use Try again where the failure is shown — on Today, on the job, in To review or in Activity.',
      'If the same job fails twice, open the posting to check it still exists. Technical details under each failure show what the assistant printed, for when you want to dig in.',
    ],
  },
  screening: {
    title: 'The screening (ATS) check',
    body: [
      'Many companies run CVs through applicant-tracking systems that read the text inside the PDF. The app reads your PDF the same way and checks that your name, contact details, headings, dates and keywords come out, in order.',
      'Two-column layouts, tables and text drawn as images often fail. Every design in My CV › Design shows its result before you choose it.',
    ],
  },
  rules: {
    title: 'Writing rules',
    body: [
      'Words to avoid and your tone notes are given to the assistant every time it writes a tailored CV or letter. They apply to the next document, not to ones already made: use Make it again to rewrite one under the current rules.',
      'Writing samples — things you wrote yourself — are the strongest way to make documents sound like you.',
    ],
  },
  never: {
    title: 'What the app never does',
    body: ['It never applies to jobs, sends email or fills in forms for you. It finds openings, checks fit and writes documents; you decide and you send.'],
  },
  assistant: {
    title: 'Installing the AI assistant (Claude Code)',
    body: [
      'The app uses Claude Code, Anthropic’s command-line assistant, to check jobs and write documents. Install it by following the instructions at claude.com/claude-code, then open a terminal and run claude once to sign in with your Claude account.',
      'Come back here and use Check again on Today or in Workspace. If Claude Code is installed somewhere unusual, set JSC_CLAUDE_BIN to its path before starting the app.',
    ],
  },
  files: {
    title: 'Files in your workspace folder',
    body: [
      'cv.md is your CV (My CV › Content). config/profile.yml is your profile (My CV › Profile). portals.yml lists the companies you follow (Companies). voice-dna.md holds your writing rules (My CV › Writing rules).',
      'data/applications.md is your list of applications (Applications) and data/pipeline.md the links to review (To review). Fit reports are in reports/ and PDFs in output/. The command-line tools read the same files, so you can use both.',
    ],
  },
};

export function HelpPage({ params }) {
  const topic = params.topic ? TOPICS[params.topic] : null;
  if (topic) {
    return (
      <>
        <PageHead title={topic.title} docTitle={topic.title} back={<a href="#/help">← Help</a>} />
        <div className="prose stack-sm">
          {topic.body.map((p) => (
            <p key={p.slice(0, 20)}>{p}</p>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <PageHead title="Help" lead={params.topic ? 'That topic doesn’t exist; here are all of them.' : 'Short answers to the questions people ask most.'} />
      <ul className="stack-sm">
        {Object.entries(TOPICS).map(([id, t]) => (
          <li key={id}>
            <a href={`#/help/${id}`}>{t.title}</a>
          </li>
        ))}
      </ul>
    </>
  );
}
