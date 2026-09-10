import { useEffect, useRef, useState } from 'react';
import { ListFilter } from 'lucide-react';
import type { WeightTagCount } from '../../api/weight';

interface WeightRecordTagFilterProps {
  tags: WeightTagCount[];
  excluded: string[];
  onChange: (excluded: string[]) => void;
}

function isExcluded(tag: string, excluded: string[]): boolean {
  const needle = tag.toLowerCase();
  return excluded.some((item) => item.toLowerCase() === needle);
}

export function WeightRecordTagFilter({ tags, excluded, onChange }: WeightRecordTagFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = excluded.length > 0;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function toggle(tag: string, hide: boolean) {
    if (hide) {
      if (isExcluded(tag, excluded)) return;
      onChange([...excluded, tag]);
      return;
    }
    onChange(excluded.filter((item) => item.toLowerCase() !== tag.toLowerCase()));
  }

  if (tags.length === 0) return null;

  return (
    <div className="weight-record-filter" ref={rootRef}>
      <button
        type="button"
        className={`button button-compact weight-record-filter-btn${active ? '' : ' button-secondary'}`}
        aria-label="Filter weight records"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <ListFilter size={16} aria-hidden="true" />
        Filter
        {active ? <span className="weight-record-filter-count">{excluded.length}</span> : null}
      </button>
      {open && (
        <div className="widget-settings-popover weight-record-filter-popover" role="dialog" aria-label="Filter weight records">
          <p className="widget-settings-title">Hide tags</p>
          <p className="widget-settings-hint">Checked tags are removed from this list.</p>
          <div className="widget-settings-checkbox-list">
            {tags.map((item) => (
              <label key={item.tag} className="checkbox-row widget-settings-checkbox">
                <input
                  type="checkbox"
                  aria-label={`Hide #${item.tag}`}
                  checked={isExcluded(item.tag, excluded)}
                  onChange={(event) => toggle(item.tag, event.target.checked)}
                />
                <span>#{item.tag}</span>
                <span className="muted-text weight-record-filter-tag-count">{item.count}</span>
              </label>
            ))}
          </div>
          {active && (
            <button
              type="button"
              className="button button-secondary button-compact"
              onClick={() => onChange([])}
            >
              Show all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
