import { Stack } from 'expo-router';

export default function VaultStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="add-prescription" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-lab-result" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-condition" options={{ presentation: 'modal' }} />
      <Stack.Screen name="view-prescription" />
      <Stack.Screen name="view-lab-result" />
      <Stack.Screen name="view-condition" />
      <Stack.Screen name="condition-search" />
    </Stack>
  );
}
