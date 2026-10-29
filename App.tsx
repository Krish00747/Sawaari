import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Image, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { brand } from './src/brand';
import { Director } from './src/Director';
import { ErrorBoundary } from './src/ErrorBoundary';
import { hasPermission, setupNotifications } from './src/notify';
import { RiderHome } from './src/RiderHome';
import { Mode, store } from './src/storage';
import { Button, C, s } from './src/ui';

export default function App() {
  const [mode, setMode] = useState<Mode | null | undefined>(undefined);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    setupNotifications()
      .then((granted) => setPermissionDenied(!granted))
      .catch(() => setPermissionDenied(true));
    store.getMode().then(setMode);
    // Re-check when returning from Settings so the warning clears by itself.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') hasPermission().then((ok) => setPermissionDenied(!ok));
    });
    return () => sub.remove();
  }, []);

  const choose = (m: Mode | null) => {
    setMode(m);
    store.setMode(m);
  };

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar style={mode === 'rider' ? 'light' : 'dark'} />
        {mode === undefined ? (
          <View style={{ flex: 1, backgroundColor: C.primary }} />
        ) : mode === 'rider' ? (
          <RiderHome onSwitchMode={() => choose('director')} permissionDenied={permissionDenied} />
        ) : mode === 'director' ? (
          <Director onSwitchMode={() => choose('rider')} permissionDenied={permissionDenied} />
        ) : (
          <ModePicker onPick={choose} />
        )}
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

function ModePicker({ onPick }: { onPick: (m: Mode) => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 24, backgroundColor: C.bg }}>
      <Image source={require('./assets/icon.png')} style={{ width: 88, height: 88, borderRadius: 20 }} />
      <View style={{ gap: 8 }}>
        <Text style={s.h1}>Set up this phone</Text>
        <Text style={s.p}>
          Pick once. You can switch later (rider mode: long-press the {brand.companyName} logo).
        </Text>
      </View>
      <Button label="Rider phone — on camera" onPress={() => onPick('rider')} />
      <Button label="Director phone — sends the cue" kind="secondary" onPress={() => onPick('director')} />
    </View>
  );
}
