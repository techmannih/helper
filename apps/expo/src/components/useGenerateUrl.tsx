import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/utils/api";
import { getBaseUrl } from "@/utils/baseUrl";

export const useAuthenticatedUrl = (path: string) => {
  const { userId } = useAuth();
  const utils = api.useUtils();
  const { data: signInToken } = api.user.getSignInToken.useQuery(undefined, {
    staleTime: 1000 * 60 * 60 * 24,
  });

  if (!userId || !signInToken) return null;
  return () => {
    utils.user.getSignInToken.invalidate();
    return `${getBaseUrl()}/login/token?userId=${userId}&token=${signInToken}&redirectUrl=${getBaseUrl()}${path}`;
  };
};
