import React from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Login from "./screens/login";
import Home from "./screens/home";
import Transfer from "./screens/transfer";
import PiggyBank from "./screens/piggybank";
import Transactions from "./screens/transactions";
import Notifications from "./screens/notifications";

const Stack = createNativeStackNavigator();

export default class App extends React.Component {

  render() {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
            <Stack.Screen name="Home" component={Home} options={{ title: 'Dashboard' }} />
            <Stack.Screen name="Transfer" component={Transfer} />
            <Stack.Screen name="PiggyBank" component={PiggyBank} />
            <Stack.Screen name="Last Transactions" component={Transactions} />
            <Stack.Screen name="Notifications" component={Notifications} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }
}
