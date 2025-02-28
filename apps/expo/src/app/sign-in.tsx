import { useAuth, useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppleLogo from "@/assets/images/appleLogo";
import GithubLogo from "@/assets/images/githubLogo";
import GoogleLogo from "@/assets/images/googleLogo";
import HelperLogo from "@/assets/images/helperLogo";
import HelperLogoWhite from "@/assets/images/helperLogoWhite";
import { api } from "@/utils/api";

const useWarmUpBrowser = () => {
  React.useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

WebBrowser.maybeCompleteAuthSession();

export default function Page() {
  const { isSignedIn, orgId } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  useWarmUpBrowser();

  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startGithubOAuthFlow } = useOAuth({ strategy: "oauth_github" });
  const { startOAuthFlow: startAppleOAuthFlow } = useOAuth({ strategy: "oauth_apple" });
  const { signIn, setActive: setSignInActive } = useSignIn();
  const { signUp, setActive: setSignUpActive } = useSignUp();
  const createDefaultOrganization = api.organization.createDefaultOrganization.useMutation();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleOAuthSignIn = React.useCallback(
    async (startOAuth: typeof startGoogleOAuthFlow) => {
      try {
        setError(null);
        setIsLoading(true);
        const { createdSessionId, signIn: oauthSignIn, signUp: oauthSignUp, setActive } = await startOAuth();

        if (createdSessionId) {
          setActive?.({ session: createdSessionId });
          return;
        }

        const userExistsButNeedsToSignIn =
          oauthSignUp?.verifications?.externalAccount?.status === "transferable" &&
          oauthSignUp?.verifications?.externalAccount?.error?.code === "external_account_exists";

        if (userExistsButNeedsToSignIn && signIn) {
          const res = await signIn.create({ transfer: true });
          if (res.status === "complete") {
            setActive?.({ session: res.createdSessionId });
            return;
          }
        }

        const userNeedsToBeCreated = oauthSignIn?.firstFactorVerification?.status === "transferable";

        if (userNeedsToBeCreated && signUp) {
          const res = await signUp.create({ transfer: true });
          if (res.status === "complete") {
            setSignUpActive({ session: res.createdSessionId });
            return;
          }
        }

        if (oauthSignIn?.firstFactorVerification.status === "unverified" && oauthSignIn.status === "needs_identifier")
          // The user cancelled the web auth flow
          return;

        console.error("Additional steps needed", { oauthSignIn, oauthSignUp });
        Sentry.captureException(new Error("Sign-in error: additional steps needed"), {
          extra: {
            strategy: oauthSignIn?.firstFactorVerification.strategy?.replace("oauth_", ""),
            signIn: { ...oauthSignIn },
            signUp: { ...oauthSignUp },
          },
        });
        setError("Unable to complete sign in. Please sign up on the web and try again.");
      } catch (err) {
        Sentry.captureException(err);
        console.error("OAuth error:", err, JSON.stringify(err, null, 2));
        setError("An error occurred during sign in. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [setSignUpActive, signUp, signIn],
  );

  const handleDevSignIn = React.useCallback(async () => {
    if (!signIn || !setSignInActive) return;

    try {
      setError(null);
      const signInAttempt = await signIn.create({
        identifier: "support@gumroad.com",
        password: "password",
      });

      if (signInAttempt.status === "complete") {
        await setSignInActive({ session: signInAttempt.createdSessionId });
      } else {
        console.error("Sign in not complete:", signInAttempt);
        setError("Failed to sign in with dev account");
      }
    } catch (err) {
      console.error("Dev sign in error:", err);
      setError("Failed to sign in with dev account");
    }
  }, [signIn, setSignInActive]);

  React.useEffect(() => {
    if (!isSignedIn) return;

    if (!orgId) {
      setIsLoading(true);
      createDefaultOrganization
        .mutateAsync()
        .then(({ id }) => setSignInActive?.({ organization: id }))
        .catch((err) => {
          console.error("Failed to create organization:", err);
          Sentry.captureException(err);
          setError("Failed to create organization");
        })
        .finally(() => setIsLoading(false));
      return;
    }

    router.replace("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, isSignedIn, orgId]);

  const Logo = colorScheme === "dark" ? HelperLogoWhite : HelperLogo;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <Logo className="h-12 mb-4" />
        <Text className="text-muted-foreground mb-8">Please sign in to continue</Text>

        <View className="w-full max-w-sm gap-3">
          <TouchableOpacity
            className="flex-row items-center justify-center bg-primary rounded-lg px-6 py-3 w-full"
            onPress={() => void handleOAuthSignIn(startGoogleOAuthFlow)}
            disabled={isLoading}
          >
            <GoogleLogo className="h-5 w-5 mr-3" />
            <Text className="text-base font-medium text-background">Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-center bg-primary rounded-lg px-6 py-3 w-full"
            onPress={() => void handleOAuthSignIn(startGithubOAuthFlow)}
            disabled={isLoading}
          >
            <GithubLogo className={`h-5 w-5 mr-3 ${colorScheme === "dark" ? "fill-black" : ""}`} />
            <Text className="text-base font-medium text-background">Continue with GitHub</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-center bg-primary rounded-lg px-6 py-3 w-full"
            onPress={() => void handleOAuthSignIn(startAppleOAuthFlow)}
            disabled={isLoading}
          >
            <AppleLogo className={`h-5 w-5 mr-3 ${colorScheme === "dark" ? "fill-black" : "fill-white"}`} />
            <Text className="text-base font-medium text-background">Continue with Apple</Text>
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity
              className="flex-row items-center justify-center px-6 py-3 w-full"
              onPress={() => void handleDevSignIn()}
              disabled={isLoading}
            >
              <Text className="text-base font-medium text-primary">Sign in as support@gumroad.com (Dev)</Text>
            </TouchableOpacity>
          )}

          {error && <Text className="text-destructive mb-4 text-center">{error}</Text>}
        </View>
      </View>
    </SafeAreaView>
  );
}
