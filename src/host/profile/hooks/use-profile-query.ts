import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi, type ProfileSnapshot } from '@/platform/backend-api/profile-api';
import type { AppLocale } from '@/domain/profile/locale';

/**
 * The one TanStack Query key for server-derived profile data (design.md §4
 * — "Settings screen and wizard both read through the same query key so a
 * mutation in one place invalidates the other"). `AppProviders`' single
 * shared `QueryClient` instance is reused — this hook never constructs its
 * own client.
 */
export const PROFILE_QUERY_KEY = ['profile'] as const;

export function useProfileQuery() {
  return useQuery<ProfileSnapshot>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => profileApi.getProfile(),
  });
}

/** Invalidates the shared profile query after any mutation that changes server-derived profile state. */
export function useInvalidateProfileQuery() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
}

export function useSetLocaleMutation() {
  const invalidate = useInvalidateProfileQuery();
  return useMutation({
    mutationFn: (locale: AppLocale) => profileApi.setLocale(locale),
    onSuccess: () => invalidate(),
  });
}
