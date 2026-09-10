import { useEffect, useRef, useState } from 'react';
import { ListFilter } from 'lucide-react';
import type { WeightTagCount } from '../../api/weight';

interface WeightRecordTagFilterProps {
  tags: WeightTagCount[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

function isSelected(tag: string, selected: string[]): boolean {
  const needle = tag.toLowerCase();
  return selected.some((item) => item.toLowerCase() === needle);
}

export function WeightRecordTagFilter({ tags, selected, onChange }: WeightRecordTagFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = selected.length > 0;

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

  function toggle(tag: string, keep: boolean) {
    if (keep) {
      if (isSelected(tag, selected)) return;
      onChange([...selected, tag]);
      return;
    }
    onChange(selected.filter((item) => item.toLowerCase() !== tag.toLowerCase()));
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
        {active ? <span className="weight-record-filter-count">{selected.length}</span> : null}
      </button>
      {open && (
        <div className="widget-settings-popover weight-record-filter-popover" role="dialog" aria-label="Filter weight records">
          <p className="widget-settings-title">Show tags</p>
          <p className="widget-settings-hint">Nothing checked shows every record. Check a tag to keep only those weigh-ins.</p>
          <div className="widget-settings-checkbox-list">
            {tags.map((item) => (
              <label key={item.tag} className="checkbox-row widget-settings-checkbox">
                <input
                  type="checkbox"
                  aria-label={`Show #${item.tag}`}
                  checked={isSelected(item.tag, selected)}
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
