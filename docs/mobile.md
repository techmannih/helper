# Mobile App Development

## Starting the Expo App

```sh
npm run dev:expo
```

Run Expo alongside `bin/dev`, and press `i` to open the iOS simulator or `a` to open the Android emulator.

### Troubleshooting

- New Tailwind classes aren't applied: Restart the app and/or Expo server. If that fails try `npx expo start --clear` to clear the cache. (Nativewind is a bit janky with live-updating styles, especially when adding previously unused classes)
- `Operation timed out`: Press `i` again once the simulator is open and on the home screen.
- Any other errors about the iOS simulator: Make sure you've created a simulator in Xcode.
  1. Start Xcode, open the `Xcode > Settings` menu, go to `Components` and make sure the iOS platform is installed.
  2. Open the `Xcode > Open Developer Tool > Simulator` menu. If a simulator doesn't open go to `File > New Simulator...` and create one.

## Building and Publishing

Before building, add a `eas.json` file to the `apps/expo` directory with:

```json
{
  "cli": {
    "version": ">= 14.1.0",
    "appVersionSource": "remote"
  },
  "build": {
    "production": {
      "channel": "production",
      "autoIncrement": true,
      "ios": {
        "distribution": "store",
        "credentialsSource": "remote"
      }
    }
  }
}
```

Also make sure to add your `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `GOOGLE_SERVICES_JSON_CONTENT` as environment variables on the Expo dashboard.

Now run:

```sh
npm run expo:build:ios
npm run expo:build:android
```

This will build remotely on Expo. Once the build is complete, you can download the build from the URL in terminal or the [Expo dashboard](https://expo.dev/accounts/antiwork/projects/helper/builds).

### Submitting to App Stores

Once you've downloaded the package:

- For iOS, use [Transporter](https://apps.apple.com/us/app/transporter/id1450874784) to upload the `.ipa` file. You can then install and test it in TestFlight before submitting to the App Store.
- For Android, upload the `.aab` file to [internal testing](https://play.google.com/console/u/0/developers/5700740786874955829/app/4972276756959833705/tracks/internal-testing), then go to app bundle details -> "Downloads" tab to get a link to install the build. Make sure you've opted in via the link on Internal testing -> Testers -> "How testers join your test" first. Then to submit to the Play Store, "Promote release" to production.

Make sure to increment the version number in `apps/expo/package.json` and `apps/expo/app.config.ts` after submitting to the app stores, since we can't upload new test builds with the same version number as a release.

## OTA Updates

For native changes we need to submit a new build, but we can use [EAS Update](https://docs.expo.dev/eas-update/getting-started/) to push updates that only involve JS changes much more quickly and easily.

```sh
npm run expo:update:production
```

This will show in the [Expo dashboard](https://expo.dev/accounts/antiwork/projects/helper/updates) and will be available on any given device when the app is restarted twice (once to download the update, once to apply it).
