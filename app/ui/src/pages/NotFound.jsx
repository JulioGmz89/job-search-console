import { PageHead } from '../shell/router.jsx';

export function NotFoundPage() {
  return (
    <>
      <PageHead title="Page not found" lead="This address doesn't match a page in the app." />
      <p>
        <a href="#/today">Go to Today</a>
      </p>
    </>
  );
}
