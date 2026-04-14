import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen
        name="register"
        options={{ gestureEnabled: false }} // Can't swipe back from setup — must complete it
      />
    </Stack>
  )
}
