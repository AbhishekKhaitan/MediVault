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

module.exports = withNativeWind(config, { input: './global.css' })
