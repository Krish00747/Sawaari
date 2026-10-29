import { Component, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Button, C, s } from './ui';

type State = { error: Error | null };

/** Catches render crashes so a bad state shows a reset button instead of closing the app mid-shoot. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: C.bg }}>
        <Text style={s.h1}>Something went wrong</Text>
        <Text style={s.p}>{this.state.error.message}</Text>
        <Button label="Try again" onPress={() => this.setState({ error: null })} />
      </View>
    );
  }
}
