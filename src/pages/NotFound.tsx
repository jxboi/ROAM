import { useDocumentMeta } from '../lib/meta';
import { EmptyState } from '../components/ui';

export function NotFound() {
  useDocumentMeta({ title: 'Page not found', description: 'That page is not on the map.', noIndex: true });
  return (
    <div className="container">
      <EmptyState
        title="A little off the beaten path."
        description="This page doesn’t exist, but your next great ride does."
      />
    </div>
  );
}
