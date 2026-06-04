import type { QuotePerson } from "../types";

interface GeometricPortraitProps {
  person: QuotePerson;
}

export function GeometricPortrait({ person }: GeometricPortraitProps) {
  return (
    <div className={`portrait portrait-${person.portrait}`} aria-label={`${person.name} portrait`}>
      <div className="portrait-frame">
        <span className="portrait-grid" />
        <span className="portrait-block portrait-block-a" />
        <span className="portrait-block portrait-block-b" />
        <span className="portrait-block portrait-block-c" />
        <span className="portrait-disc portrait-disc-a" />
        <span className="portrait-disc portrait-disc-b" />
        <span className="portrait-disc portrait-disc-c" />
        <span className="portrait-slice portrait-slice-a" />
        <span className="portrait-slice portrait-slice-b" />
        <span className="portrait-name">{person.name}</span>
      </div>
    </div>
  );
}
