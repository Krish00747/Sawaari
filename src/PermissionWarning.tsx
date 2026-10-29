import { Linking, Text, View } from 'react-native';
import { Button, C } from './ui';

/** Shown when Android notification permission is off — nothing can appear on screen until it's on. */
export function PermissionWarning() {
  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: '#FDECEA', borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: '#F5C2BC' }}
    >
      <Text style={{ color: C.danger, fontWeight: '700', fontSize: 15 }}>Notifications are turned off</Text>
      <Text style={{ color: '#5F2120' }}>Turn them on for this app, or no cue will show on this phone.</Text>
      <Button label="Open settings" kind="ghost" onPress={() => Linking.openSettings()} />
    </View>
  );
}
