import React from 'react';
import { Text, View, StyleSheet } from "react-native";
import { MaterialIcons } from '@expo/vector-icons'

const Message = function({ type, message, clearMessage }) {
    return (
        <>
            {message != "" &&
                <View style={{...styles.container, backgroundColor: type == 'success' ? 'green' : (type == 'error' ? 'red' : 'grey')}}>
                    <Text style={styles.alert}>{message}</Text>
                    <MaterialIcons
                        style={{color: 'white'}}
                        name='close'
                        size={30}
                        onPress={clearMessage}
                    />
                </View>
            }
        </>
    )
}

const styles = StyleSheet.create({
    container: {
        margin: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: 10,
        padding: 15,
    },
    alert: {
        color: 'white',
        fontSize: 15,
    },
})

export default Message
