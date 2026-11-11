/** Route changes keep the current header and show a slim bar, rather than flashing a page-shaped skeleton. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading page" className="route-progress">
      <span className="sr-only">Loading…</span>
    </div>
  );
}
