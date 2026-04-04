/**
 * Standardised empty state components.
 *
 * EmptyState   — block-level, used inside <section> / <div> cards
 * TableEmptyRow — <tr><td> variant for data tables
 */

type EmptyStateProps = {
  message: string;
  hint?: string;
};

export function EmptyState({ message, hint }: EmptyStateProps) {
  return (
    <div className="py-6 text-center">
      <p className="text-sm text-slate-400">{message}</p>
      {hint && <p className="mt-1 text-xs text-slate-300">{hint}</p>}
    </div>
  );
}

export function TableEmptyRow({
  message,
  colSpan,
}: {
  message: string;
  colSpan: number;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-6 text-center text-sm text-slate-400"
      >
        {message}
      </td>
    </tr>
  );
}
