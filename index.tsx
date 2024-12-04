import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import ChatScreen from '../comp/chatbot';
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';  // Only one NavigationContainer here
const App = () => {
  return (
    <NavigationIndependentTree>
    <NavigationContainer >
    <SafeAreaView style={styles.container}>
      <ChatScreen />
    </SafeAreaView>
    </NavigationContainer>
    </NavigationIndependentTree>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default App;
