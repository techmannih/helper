# Desktop App Development

#### Starting the Tauri app

```sh
npm run dev:tauri
```

This will connect to local Helper, so run alongside `bin/dev`.

#### Building the app package

Note: the desktop app build scripts are designed for macOS. The Windows and Linux apps should be buildable on their respective platforms, but the commands may not work as-is.

To prepare your environment:

1. Download the p12 file from your Apple Developer Certificates and double click it to install to your keychain.
2. Place your "Helper_Mac_App_Store.provisionprofile", "helper.key" and "helper.key.pub" in the `apps/tauri/src-tauri` directory. Use `npm run tauri signer generate -- -w ~/.tauri/helper.key` to generate the key files if you don't have them yet.
3. Fill in `.env` with:

   ```
   TAURI_SIGNING_PRIVATE_KEY=helper.key
   TAURI_SIGNING_PRIVATE_KEY_PASSWORD=<your key's password>
   ```

4. Make sure you've been added to the Apple Developer account, then generate an [app-specific password](https://support.apple.com/en-us/102654) for your Apple ID.
5. Create `apps/tauri/.env.macdmg` with:

   ```
   APPLE_SIGNING_IDENTITY=<your signing identity - should look like "Developer ID Application: Your Company (ABCDE12345)">
   APPLE_ID=<your Apple ID email>
   APPLE_ID_PASSWORD=<an app-specific password - see https://support.apple.com/en-us/102654>
   APPLE_TEAM_ID=<your Apple Developer account team ID>
   ```

6. Create `apps/tauri/.env.macappstore` with:

   ```
   APPLE_SIGNING_IDENTITY=<your signing identity - should look like "Apple Distribution: Your Company (ABCDE12345)">
   INSTALLER_SIGNING_IDENTITY=<your signing identity - should look like "3rd Party Mac Developer Installer: Your Company (ABCDE12345)">
   ```

Now install dependencies:

```sh
# Install Rustup
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh

# Extras for cross-compiling the Windows app on Mac
brew install nsis
brew install llvm # Make sure to add /opt/homebrew/opt/llvm/bin to your $PATH as suggested in the install output.
rustup target add x86_64-pc-windows-msvc
sh -c '(cd apps/tauri && cargo install --locked cargo-xwin)'
```

Now run `npm run tauri:build` to build the app for all platforms. Note that while building the DMG it'll open a Finder window temporarily; just wait for it to close again.

This will create installable packages in `apps/tauri/target` as described in the command output. Use `npm run tauri:upload-bundles` to upload the bundles to the Next.js app's S3 bucket.

#### Publish to Mac App Store

- You will need to be a member of an Apple Developer account in App Store Connect.
- After building, upload the `apps/tauri/Helper_Mac_App_Store.pkg` file using [Transporter](https://apps.apple.com/us/app/transporter/id1450874784).
- Make sure to check it works in TestFlight for Mac.
- Submit for review in the Distribution tab.
