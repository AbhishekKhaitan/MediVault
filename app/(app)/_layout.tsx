import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { C } from '../../constants/theme'

type IconName = React.ComponentProps<typeof Ionicons>['name']

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as IconName)}
      size={22}
      color={focused ? C.accent : C.textSub}
    />
  )
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textSub,
        tabBarStyle: {
          backgroundColor: C.tabBar,
          borderTopColor: C.tabBorder,
          paddingBottom: 8,
          paddingTop: 8,
          height: 62,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen name="member/[id]" options={{ href: null }} />
      <Tabs.Screen name="paywall" options={{ href: null }} />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Upload',
          tabBarIcon: ({ focused }) => <TabIcon name="cloud-upload" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: 'Emergency',
          tabBarIcon: ({ focused }) => (
            <Ionicons name="medkit" size={22} color={focused ? C.danger : C.textSub} />
          ),
          tabBarActiveTintColor: C.danger,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
