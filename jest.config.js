module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/backend/'],
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '(jest-)?react-native' +
      '|@react-native(-community)?' +
      '|expo(nent)?' +
      '|@expo(nent)?/.*' +
      '|@expo-google-fonts/.*' +
      '|react-navigation' +
      '|@react-navigation/.*' +
      '|@unimodules/.*' +
      '|unimodules' +
      '|sentry-expo' +
      '|native-base' +
      '|react-native-svg' +
      '|react-native-calendars' +
      '|react-native-reanimated' +
      '|react-native-worklets' +
    '))',
  ],
  moduleNameMapper: {
    // Stub out Expo SDK 54 "winter" runtime.
    // jest-expo's setup does require('expo/src/winter') which loads runtime.native.ts,
    // which installs lazy globals that fail in Jest (they try to dynamically import
    // modules that are "outside test scope"). Stubbing the whole winter dir breaks the chain.
    '^expo/src/winter$': '<rootDir>/src/__mocks__/expoWinterStub.js',
    '^expo/src/winter/(.*)$': '<rootDir>/src/__mocks__/expoWinterStub.js',
    // Mock AsyncStorage directly so the native module is never loaded
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js',
    // Path aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@context/(.*)$': '<rootDir>/src/context/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
};
