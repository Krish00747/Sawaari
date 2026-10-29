import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { brand } from './src/brand';
import { Director } from './src/Director';
import { setupNotifications } from './src/notify';
import { RiderHome } from './src/RiderHome';
import { Mode, store } from './src/storage';
import { Button, C, s } from './src/ui';

export default function App() {
  const [mode, setMode] = useState<Mode | null | undefined>(undefined);

  useEffect(() => {
    setupNotifications();
    store.getMode().then(setMode);
  }, []);

  const choose = (m: Mode | null) => {
    setMode(m);
    store.setMode(m);
  };

  return (
    <SafeAreaProvider>
      <StatusBar style={mode === 'rider' ? 'light' : 'dark'} />
      {mode === undefined ? (
        <View style={{ flex: 1, backgroundColor: C.primary }} />
      ) : mode === 'rider' ? (
        <RiderHome onSwitchMode={() => choose('director')} />
      ) : mode === 'director' ? (
        <Director onSwitchMode={() => choose('rider')} />
      ) : (
        <ModePicker onPick={choose} />
      )}
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
