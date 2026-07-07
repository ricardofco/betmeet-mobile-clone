/**
 * Spanish string catalog (ADR-044) — the default locale (ADR-012) and the
 * fallback for an undetected/unsupported device locale (NFR-10.4). Mirrors
 * `en.ts`'s key shape exactly; see that file's header comment for this
 * bolt's coverage scope.
 */
export const es = {
  common: {
    retry: 'Reintentar',
    loading: 'Cargando…',
    cancel: 'Cancelar',
    save: 'Guardar',
    error: 'Algo salió mal',
    // Bolt 12 (EDU-3, design.md §5) — mirrors en.ts's addition.
    continue: 'Continuar',
    skipForNow: 'Saltar por ahora',
  },
  navigation: {
    tabs: {
      home: 'Inicio',
      predictions: 'Pronósticos',
      pools: 'Ligas',
      rankings: 'Clasificación',
    },
    openMenu: 'Abrir menú',
    drawer: {
      settings: 'Ajustes',
    },
  },
  home: {
    title: 'Liga Mundial',
    // Bolt 12 (ADR-053) — mirrors en.ts's addition.
    subtitle: 'El paquete host está funcionando.',
    openRulesCenter: 'Abrir centro de reglas',
  },
  settings: {
    title: 'Ajustes de la cuenta',
    sections: {
      profile: 'Perfil',
      security: 'Seguridad',
      account: 'Cuenta',
    },
    rows: {
      nickname: 'Apodo',
      avatar: 'Avatar',
      language: 'Idioma',
      changePassword: 'Cambiar contraseña',
      changeEmail: 'Cambiar correo',
      twoFactor: 'Activar autenticación de dos factores',
      deleteAccount: 'Eliminar cuenta',
      // Bolt 13 (ADMIN-1) — mirrors en.ts's addition.
      admin: 'Administración',
    },
    headers: {
      twoFactor: 'Autenticación de dos factores',
    },
  },
  predictions: {
    title: 'Pronósticos',
    loading: 'Cargando partidos…',
    empty: 'Todavía no hay partidos para pronosticar.',
    error: 'No se pudieron cargar los partidos. Desliza para reintentar.',
  },
  pools: {
    myPools: {
      title: 'Mis ligas',
      empty: 'Todavía no te uniste a ninguna liga.',
      loading: 'Cargando tus ligas…',
      error: 'No se pudieron cargar tus ligas.',
      create: 'Crear una liga',
      discover: 'Descubrir ligas públicas',
      joinByToken: 'Unirse con código',
    },
    detail: {
      loading: 'Cargando liga…',
      error: 'No se pudo cargar esta liga.',
      notFound: 'Liga no encontrada.',
      members: 'Miembros',
      settings: 'Ajustes de la liga',
      predictionsButton: 'Pronósticos',
      leave: 'Salir de la liga',
      archive: 'Archivar',
      unarchive: 'Desarchivar',
      typePublic: 'Pública',
      typePrivate: 'Privada',
      memberCount: '{{count}}/{{capacity}} miembros',
      archivedBadge: 'Archivada',
      leaderboard: 'Clasificación',
    },
    screens: {
      myPools: 'Mis ligas',
      discoverPools: 'Descubrir ligas',
      createPool: 'Crear liga',
      joinByToken: 'Unirse con código',
      poolDetail: 'Liga',
      poolSettings: 'Ajustes de la liga',
      poolPredictions: 'Pronósticos',
      poolLeaderboard: 'Clasificación',
    },
    leaderboardScreen: {
      loading: 'Cargando clasificación…',
      error: 'No se pudo cargar esta clasificación.',
      notMember: 'Debes ser miembro de esta liga para ver su clasificación.',
      empty: 'Todavía no hay miembros.',
    },
  },
  rankings: {
    title: 'Clasificación',
    loading: 'Cargando clasificación…',
    error: 'No se pudo cargar la clasificación.',
    empty: 'Todavía no hay jugadores clasificados.',
    live: 'EN VIVO',
    anonymousPlayer: 'Jugador',
  },
  // Bolt 12 (EDU-1) — mirrors en.ts's addition.
  rules: {
    centerTitle: 'Centro de reglas',
    centerSubtitle: 'Todo lo que necesitas saber para jugar.',
    demoTitle: 'Ejemplos',
    documents: {
      scoring: { title: 'Puntuación' },
      penalties: { title: 'Predicción de penales' },
      'match-locks': { title: 'Bloqueo de predicciones' },
      ties: { title: 'Empates en el ranking' },
      pools: { title: 'Ligas y miembros' },
    },
  },
  // Bolt 12 (EDU-2) — mirrors en.ts's addition.
  calculator: {
    title: 'Calculadora de puntos',
    description: 'Introduce una predicción y un resultado para ver cuántos puntos ganarías.',
    prediction: 'Tu predicción',
    actual: 'Resultado real',
    home: 'Local',
    away: 'Visitante',
    knockout: 'Fase eliminatoria (permite penales)',
    penaltyShootout: 'Tanda de penales',
    penaltyBonusHint:
      'El bonus (+1) se gana por acertar quién gana la tanda, no por el marcador exacto.',
    penaltyTie: 'La tanda de penales no puede terminar empatada. Ajusta el marcador.',
    penaltyDerivedWinner: 'Gana en penales:',
    total: 'Puntos obtenidos',
    fallbackTitle: 'Tabla de puntuación',
    fallbackNote: 'La calculadora no está disponible ahora, pero estas son las reglas.',
  },
  // Bolt 12 (EDU-2) — mirrors en.ts's addition.
  breakdown: {
    exact: 'Acertaste el marcador exacto.',
    result: 'Acertaste el resultado (+2 puntos).',
    partial: 'Acertaste goles de al menos un equipo.',
    miss: 'No acertaste el marcador ni el resultado.',
    penaltyApplied: 'Además acertaste el ganador de penales (+1).',
    base: 'Puntos base',
    penalty: 'Bonus de penales',
    total: 'Total',
    resultPoints: 'Resultado',
    homeGoalPoints: 'Goles local',
    awayGoalPoints: 'Goles visitante',
  },
  // Bolt 12 (EDU-2/EDU-3) — mirrors en.ts's addition.
  scoring: {
    exact: 'Marcador exacto',
    exactPoints: '5 puntos',
    result: 'Resultado correcto (+2 puntos)',
    resultPoints: '2 puntos',
    partial: 'Goles de un equipo (+1 punto c/u)',
    partialPoints: '1 punto por equipo',
    miss: 'Fallas todo',
    missPoints: '0 puntos',
    penaltyBonus: 'Bonus por acertar el ganador de penales',
    penaltyBonusPoints: '+1 punto',
  },
  // Bolt 12 (EDU-4) — mirrors en.ts's addition.
  education: {
    cues: {
      rulesAccordionIntro: 'Toca una sección para expandirla y leer la regla completa.',
      calculatorIntro: 'Pruébalo tú mismo: cambia los marcadores y mira cómo se actualizan los puntos en vivo.',
      dismiss: 'Descartar',
    },
  },
  // Bolt 12 (EDU-3) — mirrors en.ts's addition.
  onboarding: {
    rulesStepTitle: 'Aprende a jugar',
    rulesStepDescription:
      'Así se reparten los puntos. Puedes consultar las reglas completas cuando quieras.',
    rulesStepReviewLater: 'Puedes abrir el Centro de reglas completo cuando quieras desde Inicio.',
  },
  // Bolt 13 (ADMIN-1..5) — mirrors en.ts's addition.
  admin: {
    screens: {
      adminHome: 'Administración',
      sweepStatus: 'Reevaluación de resultados',
      forceResult: 'Forzar resultado',
      revertOverride: 'Revertir anulación',
    },
    home: {
      title: 'Administración',
      loading: 'Comprobando acceso…',
      accessDenied: 'No tienes acceso a esta sección.',
      sweepButton: 'Reevaluación de resultados',
      forceResultButton: 'Forzar resultado',
      revertOverrideButton: 'Revertir anulación',
    },
    sweep: {
      title: 'Reevaluación de resultados',
      description:
        'Busca partidos finalizados que aún no tienen puntaje y los puntúa. Esta app no tiene conexión con ningún feed externo de resultados — esto no obtiene datos nuevos de partidos.',
      lastRunLabel: 'Última ejecución',
      neverRun: 'Nunca se ejecutó',
      matchesScoredLabel: 'Partidos puntuados en esa ejecución',
      triggerButton: 'Revisar partidos finalizados sin puntaje',
      loading: 'Cargando estado de la reevaluación…',
      error: 'No se pudo cargar el estado de la reevaluación.',
    },
    forceResult: {
      title: 'Forzar resultado',
      description:
        'Esta app no tiene un feed automático de resultados. Forzar un resultado aquí es actualmente la única forma de que un partido quede finalizado con puntaje.',
      selectMatch: 'Selecciona un partido',
      homeScore: 'Goles local',
      awayScore: 'Goles visitante',
      penaltyShootout: 'Tanda de penales',
      homePenaltyScore: 'Penales local',
      awayPenaltyScore: 'Penales visitante',
      penaltyWinner: 'Gana en penales',
      reasonLabel: 'Motivo (obligatorio)',
      reasonPlaceholder: 'Explica por qué se fuerza este resultado…',
      submitButton: 'Forzar resultado',
      loading: 'Cargando partidos…',
      error: 'No se pudieron cargar los partidos.',
      empty: 'Todavía no hay partidos con ambos equipos definidos.',
      success: 'Resultado forzado y predicciones recalculadas.',
      errors: {
        FORBIDDEN: 'No tienes acceso a esta acción.',
        NOT_FOUND: 'Partido no encontrado.',
        TEAMS_NOT_RESOLVED: 'Ambos equipos deben estar definidos antes de forzar un resultado.',
        VALIDATION_FAILED: 'Revisa los marcadores y el motivo ingresados.',
        PENALTY_WINNER_MISMATCH: 'El ganador de penales no coincide con el marcador de la tanda ingresado.',
      },
    },
    revertOverride: {
      title: 'Revertir anulación',
      selectMatch: 'Selecciona un partido',
      currentResult: 'Resultado forzado actual',
      overriddenBy: 'Anulado por',
      reason: 'Motivo',
      warning:
        'Esto no se puede deshacer. Ningún feed de resultados repoblará este partido — revertir elimina cada puntaje de predicción para él.',
      confirmLabel: 'Escribe los códigos FIFA de este partido para confirmar: {{codes}}',
      confirmPlaceholder: 'ARG-FRA',
      submitButton: 'Revertir anulación',
      loading: 'Cargando partidos…',
      error: 'No se pudieron cargar los partidos.',
      empty: 'No hay partidos con una anulación activa.',
      success: 'Anulación revertida.',
      errors: {
        FORBIDDEN: 'No tienes acceso a esta acción.',
        NOT_FOUND: 'Partido no encontrado.',
        NOT_OVERRIDDEN: 'Este partido no tiene una anulación activa.',
      },
    },
    matchList: {
      knockout: 'Eliminatoria',
      unresolved: 'Equipos aún no definidos',
    },
  },
} as const;
