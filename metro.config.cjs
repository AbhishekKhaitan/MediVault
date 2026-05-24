// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config')

let withNativeWind
try {
  withNativeWind = require('nativewind/metro').withNativeWind
} catch {
  withNativeWind = (c) => c
}

const config = getDefaultConfig(__dirname)

// Fix Windows + Node 24 ESM path issue — ensure resolver uses CommonJS
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
}

// @supabase/auth-js uses private class fields (#field) which Hermes can't
// handle unless Babel transforms the package first. Add it to the allowlist.
const defaultBlockList = config.transformer?.transformIgnorePatterns?.[0]
  ?? /node_modules\/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?(\/.*)?|@expo\/vector-icons|react-navigation|@react-navigation\/.*|@unimodules\/.*|unimodules|sentry-expo|native-base|react-native-svg)/

const TRANSFORM_ALLOWLIST = [
  '@supabase/auth-js',
  '@supabase/realtime-js',
  '@supabase/supabase-js',
]

// Build a pattern that excludes node_modules EXCEPT the packages above
const allowlistPattern = TRANSFORM_ALLOWLIST.map(p => p.replace('/', '\\/')).join('|')
config.transformer = {
  ...config.transformer,
  transformIgnorePatterns: [
    new RegExp(
      `node_modules\\/(?!(${allowlistPattern}|((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?(\\/.*)?|nativewind|react-native-reanimated|react-native-svg|react-native-safe-area-context|react-native-screens))`
    ),
  ],
}

module.exports = withNativeWind(config, { input: './global.css' })
