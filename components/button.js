import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";

function Button({title, onPress, style}) {
    return (
        <TouchableOpacity onPress={onPress} style={style}>
            <View style={styles.button}>
                <Text style={styles.buttonText}>{ title }</Text>
            </View>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    button: {
        borderRadius: 15,
        padding: 15,
        backgroundColor: "rgb(221,240,251)",
    },
    buttonText: {
        color: "rgb(36,160,237)",
        fontWeight: "bold",
        fontSize: 16,
        textAlign: "center"
    }
})

export default Button

