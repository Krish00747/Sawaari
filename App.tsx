import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { brand } from './src/brand';
import { Director } from './src/Director';
import { ErrorBoundary } from './src/ErrorBoundary';
import { RiderHome } from './src/RiderHome';
import { Mode, ShowProvider, useShow } from './src/sync/ShowContext';
import { Button, C, s } from './src/ui';

const MODE_KEY = 'sawaari.mode';

export default function App() {
  const [mode, setMode] = useState<Mode | null | undefined>(undefined);

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY)
      .then((m) => setMode(m === 'rider' || m === 'director' ? m : null))
      .catch(() => setMode(null));
  }, []);

  const choose = (m: Mode) => {
    setMode(m);
    AsyncStorage.setItem(MODE_KEY, m).catch(() => undefined);
  };

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        {mode === undefined ? (
          <View style={{ flex: 1, backgroundColor: C.primary }} />
        ) : mode === null ? (
          <ModePicker onPick={choose} />
        ) : (
          <ShowProvider mode={mode}>
            <Ready>
              {mode === 'rider' ? <RiderHome onSwitchMode={() => choose('director')} /> : <Director onSwitchMode={() => choose('rider')} />}
              {mode === 'director' && <StatusBar style="light" />}
            </Ready>
          </ShowProvider>
        )}
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

/** Waits for the saved show to load so nothing flashes the template first. */
function Ready({ children }: { children: React.ReactNode }) {
  const { ready } = useShow();
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.primary }} />;
  return <>{children}</>;
}

function ModePicker({ onPick }: { onPick: (m: Mode) => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 24, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      <Image source={require('./assets/icon.png')} style={{ width: 88, height: 88, borderRadius: 20 }} />
      <View style={{ gap: 8 }}>
        <Text style={s.h1}>Set up this phone</Text>
        <Text style={s.p}>Pick once. You can switch later (rider mode: hold the {brand.companyName} logo → Crew panel).</Text>
      </View>
      <Button label="Rider phone — on camera" onPress={() => onPick('rider')} />
      <Button label="Director phone — fires the cues" kind="secondary" onPress={() => onPick('director')} />
    </View>
  );
}
