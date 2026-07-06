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
  },
  navigation: {
    tabs: {
      home: 'Inicio',
      predictions: 'Pronósticos',
      pools: 'Ligas',
    },
    openMenu: 'Abrir menú',
    drawer: {
      settings: 'Ajustes',
    },
  },
  home: {
    title: 'Liga Mundial',
    subtitle: 'El paquete host está funcionando. Toca abajo para cargar el remoto federado `education`.',
    loadEducationRemote: 'Cargar remoto de educación',
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
    },
    screens: {
      myPools: 'Mis ligas',
      discoverPools: 'Descubrir ligas',
      createPool: 'Crear liga',
      joinByToken: 'Unirse con código',
      poolDetail: 'Liga',
      poolSettings: 'Ajustes de la liga',
      poolPredictions: 'Pronósticos',
    },
  },
} as const;
