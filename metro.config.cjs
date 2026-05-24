// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config')

let withNativeWind
try {
  withNativeWind = require('nativewind/metro').withNativeWind
} catch {
  withNativeWind = (c) => c
}

const config = getDefaultConfig(__dirname)

// Fix Windows ESM path issue
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
}

// Apply NativeWind first, then override transformIgnorePatterns so it
// doesn't get clobbered. @supabase/auth-js ships CJS with private class
// fields (#prop) that Hermes rejects unless Babel compiles them first.
const finalConfig = withNativeWind(config, { input: './global.css' })

finalConfig.transformer = {
  ...finalConfig.transformer,
  transformIgnorePatterns: [
    /node_modules\/(?!(@supabase|@react-native-async-storage|react-native|@react-native|expo|@expo|nativewind|react-native-reanimated|react-native-svg|react-native-safe-area-context|react-native-screens))/,
  ],
}

module.exports = finalConfig
