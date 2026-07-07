import type { AppLocale } from '@/domain/profile/locale';

/**
 * EDU-1's content shape (design.md §2.2, ADR-055). Authored directly as typed
 * data — no markdown/MDX is parsed at runtime. `title` is deliberately not
 * stored here (it lives in the i18n catalog, `rules.documents.<slug>.title`)
 * since a document title is chrome text, not content-body prose (every other
 * bolt's user-facing string lives in `en.ts`/`es.ts`). `audience` is dropped
 * entirely — mobile only ever needs `'full'` (model.md §6).
 */
export type RuleContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'example'; label: string; text: string };

export type RuleSlug = 'scoring' | 'penalties' | 'match-locks' | 'ties' | 'pools';

export interface RuleDocument {
  slug: RuleSlug;
  /** Display sort key — mirrors betmeet-clone's `order` field 1:1. */
  order: number;
  sections: RuleContentBlock[];
}

// ---------------------------------------------------------------------------
// Content, transcribed by hand from betmeet-clone's
// content/rules/{en,es}/*.mdx (5 documents) per ADR-055's "no markdown
// syntax parsed at runtime" decision — bold spans dropped (already implied
// by the numeric callouts), the one `## ` heading per document not
// re-rendered (redundant with `order`/the i18n `title`), and the one literal
// "**Example**: ..." callout ported as an `example` block (`scoring.mdx`).
// ---------------------------------------------------------------------------

const EN_RULES: RuleDocument[] = [
  {
    slug: 'scoring',
    order: 1,
    sections: [
      {
        type: 'paragraph',
        text: 'Every match you predict can give you points depending on how close you are to the actual score:',
      },
      {
        type: 'list',
        items: [
          'Exact score (home and away): 5 points.',
          "If you don't hit the exact score, the following stack up: correct result (winner or draw), +2 points.",
          'Matched team goals: +1 point per team (0, 1, or 2 points).',
          'No hit: 0 points.',
        ],
      },
      {
        type: 'example',
        label: 'Example',
        text: "Actual result BRA 2-1 ARG, your prediction BRA 3-2 ARG. You got the winner (+2) and ARG's goals (+1). Total: 3 points.",
      },
      {
        type: 'paragraph',
        text: 'In knockout stages, if you guess the penalty shootout winner, you earn +1 additional point.',
      },
      {
        type: 'paragraph',
        text: 'Use the calculator below to see live examples.',
      },
    ],
  },
  {
    slug: 'penalties',
    order: 2,
    sections: [
      {
        type: 'paragraph',
        text: 'In knockout matches (round of 16 onward), if you predict a draw in the score, you can choose which team wins the penalty shootout.',
      },
      {
        type: 'list',
        items: [
          'It only appears in knockout-stage matches.',
          'It is only enabled when your goal prediction is a draw (for example, 1-1).',
          'You do not need to enter how many penalties: only who advances.',
        ],
      },
      {
        type: 'paragraph',
        text: 'If you guess the penalty winner, you add +1 point to your base score.',
      },
    ],
  },
  {
    slug: 'match-locks',
    order: 3,
    sections: [
      {
        type: 'paragraph',
        text: 'You can create and edit your prediction as many times as you want until the match starts.',
      },
      {
        type: 'list',
        items: [
          'When the match starts, your last saved prediction is locked.',
          'After match start, it can no longer be edited.',
          'The lock uses the official match time, not your device time.',
        ],
      },
    ],
  },
  {
    slug: 'ties',
    order: 4,
    sections: [
      {
        type: 'paragraph',
        text: 'There is a league ranking and a global ranking: you compete against your league and also against all users.',
      },
      {
        type: 'paragraph',
        text: 'If two or more people finish with the same points, they share the same position. There is no tiebreaker: a points tie is a position tie.',
      },
    ],
  },
  {
    slug: 'pools',
    order: 5,
    sections: [
      {
        type: 'paragraph',
        text: 'A league is the group where you compete. It can be public (appears in the directory) or private (joined through an invitation link).',
      },
      {
        type: 'list',
        items: [
          'Capacity of up to 100 members.',
          'You can participate in several leagues at the same time.',
          'The league creator is its administrator and can remove a member.',
          'You cannot join if the league has reached its limit.',
        ],
      },
    ],
  },
];

const ES_RULES: RuleDocument[] = [
  {
    slug: 'scoring',
    order: 1,
    sections: [
      {
        type: 'paragraph',
        text: 'Cada partido que predices te puede dar puntos según qué tan cerca estés del marcador real:',
      },
      {
        type: 'list',
        items: [
          'Marcador exacto (local y visitante): 5 puntos.',
          'Si no aciertas el exacto, se suman los siguientes puntos: resultado correcto (ganador o empate), +2 puntos.',
          'Goles de un equipo acertados: +1 punto por equipo (0, 1 o 2 puntos).',
          'Nada acertado: 0 puntos.',
        ],
      },
      {
        type: 'example',
        label: 'Ejemplo',
        text: 'Resultado real BRA 2-1 ARG, tu predicción BRA 3-2 ARG. Acertaste el ganador (+2) y los goles de ARG (+1). Total: 3 puntos.',
      },
      {
        type: 'paragraph',
        text: 'En fases eliminatorias, si aciertas el ganador de la tanda de penales, ganas +1 punto adicional.',
      },
      {
        type: 'paragraph',
        text: 'Usa la calculadora de abajo para ver ejemplos en vivo.',
      },
    ],
  },
  {
    slug: 'penalties',
    order: 2,
    sections: [
      {
        type: 'paragraph',
        text: 'En los partidos de eliminación directa (octavos en adelante), si predices un empate en el marcador, podrás elegir qué equipo gana en la tanda de penales.',
      },
      {
        type: 'list',
        items: [
          'Solo aparece en partidos de fase eliminatoria.',
          'Solo se habilita si tu predicción de goles es un empate (por ejemplo, 1-1).',
          'No necesitas indicar cuántos penales: solo quién pasa.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Si aciertas al ganador de penales, sumas +1 punto sobre tu puntaje base.',
      },
    ],
  },
  {
    slug: 'match-locks',
    order: 3,
    sections: [
      {
        type: 'paragraph',
        text: 'Puedes crear y modificar tu predicción las veces que quieras hasta el momento del inicio del partido.',
      },
      {
        type: 'list',
        items: [
          'Al iniciar el partido, tu última predicción guardada queda bloqueada.',
          'Después del inicio del partido ya no se puede editar.',
          'El bloqueo usa la hora oficial del partido, no la de tu dispositivo.',
        ],
      },
    ],
  },
  {
    slug: 'ties',
    order: 4,
    sections: [
      {
        type: 'paragraph',
        text: 'Hay ranking por liga y ranking global: compites contra tu liga y también contra todos los usuarios.',
      },
      {
        type: 'paragraph',
        text: 'Si dos o más personas terminan con los mismos puntos, comparten la misma posición. No hay criterio de desempate: un empate de puntos es un empate de posición.',
      },
    ],
  },
  {
    slug: 'pools',
    order: 5,
    sections: [
      {
        type: 'paragraph',
        text: 'Una liga es el grupo donde compites. Puede ser pública (aparece en el directorio) o privada (se entra con un enlace de invitación).',
      },
      {
        type: 'list',
        items: [
          'Capacidad de hasta 100 miembros.',
          'Puedes participar en varias ligas a la vez.',
          'El creador de la liga es su administrador y puede expulsar a un miembro.',
          'No se puede entrar si la liga ya alcanzó su límite.',
        ],
      },
    ],
  },
];

/**
 * Mirrors betmeet-clone's own `getFullRules(locale)` name/signature
 * (`src/lib/rules-content.ts`, ADR-055) — a fresh, independent
 * reimplementation, not a port of the MDX pipeline. Returns all 5 documents
 * for the given locale, sorted by `order` ascending.
 */
export function getFullRules(locale: AppLocale): RuleDocument[] {
  const source = locale === 'en' ? EN_RULES : ES_RULES;
  return [...source].sort((a, b) => a.order - b.order);
}
