import React, { createContext, useContext } from 'react';
import { createReactInlineContentSpec } from '@blocknote/react';
import type { EntityReference, EntityType } from '../types';

/**
 * Slice 4.2e — the doc's "one custom piece to build on top of the
 * library": typing `[[` or `@` inside any BlockNote document
 * (`BlockNoteFreeformField.tsx`) opens a picker; selecting a result
 * inserts one of these inline nodes. `createReactInlineContentSpec`'s
 * `propSchema` only accepts primitives (string/number/boolean), so the
 * `EntityReference` is flattened into 4 string props rather than
 * stored as one nested object prop.
 */
export interface EntityReferenceLinkingHandlers {
  onOpenPlannerEntity: (ref: EntityReference) => void;
  onOpenHostEntity?: (type: EntityType, id: string) => void;
}

/**
 * BlockNote's schema (and therefore this inline content's `render`) is
 * defined once, outside React's render tree — this Context is the only
 * way to get the *currently mounted* app's navigation callbacks into
 * it, read via `useContext` at click time.
 */
export const EntityReferenceLinkingContext = createContext<EntityReferenceLinkingHandlers | null>(null);

export const entityReferenceInlineContentSpec = createReactInlineContentSpec(
  {
    type: 'entityReference',
    content: 'none',
    propSchema: {
      refType: { default: '' },
      refId: { default: '' },
      refSource: { default: 'planner' },
      label: { default: '' },
    },
  },
  {
    render: (props) => {
      const linking = useContext(EntityReferenceLinkingContext);
      const { refType, refId, refSource, label } = props.inlineContent.props;

      const handleClick = () => {
        if (!linking) return;
        if (refSource === 'host') linking.onOpenHostEntity?.(refType as EntityType, refId);
        else linking.onOpenPlannerEntity({ type: refType as EntityType, id: refId, source: 'planner' });
      };

      return (
        <span
          onClick={handleClick}
          contentEditable={false}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-emerald-50 text-emerald-700 text-sm font-medium cursor-pointer hover:bg-emerald-100 select-none"
        >
          {label || `${refType}:${refId}`}
        </span>
      );
    },
  }
);
