import React, { useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, TextInput } from "react-native";
import Button from "../components/button"
import Modal from "react-native-modal"

const Confirmation = function({ isVisible, setVisible, confirmAction, message }) {
    const [err, setErr] = useState('')
    const [pin, setPIN] = useState('')

    const handlerPIN = (text) => {
        setErr('')
        setPIN(text)
    }

    const confirmHandler = () => {
        if (!validPINStructure(pin)) {
            setErr('Invalid PIN structure')
        }
        else {
            confirmAction(pin).then(isValidPIN => {
                setPIN('')
                if (!isValidPIN) {
                    setErr('Wrong PIN')
                }
                else {
                    setVisible(false)
                }
            }).catch(e => {
                setErr(e.toString())
                setPIN('')
            })
            
        }
    }

    return (
        <View>
            <Modal isVisible={isVisible} backdropTransitionOutTiming={0}>
                <View style={styles.container}>
                    <Text style={{fontSize: 16, textAlign: 'justify', fontWeight: 'bold'}}>{message}</Text>
                    <Text style={[styles.label, {marginTop: 20}]}>Confirm PIN</Text>
                    <View style={[styles.row, {marginBottom: 20}]}>
                        <TextInput
                            style={{...styles.textInput, borderColor: err ? 'red' : 'black'}}
                            value={pin}
                            keyboardType = 'number-pad'
                            secureTextEntry={true}
                            onChangeText={(text) => handlerPIN(text)}
                            textAlign="center"
                            maxLength={4}
                            />
                    </View>
                    {err != "" && <Text style={{textAlign: 'center', color: 'red', fontSize: 15, marginTop: -10, marginBottom: 10}}>{err}</Text>}
                    <View style={styles.right}>
                        <Button title="Cancel" style={{marginRight: 10}} onPress={() => {setVisible(false);setErr('');setPIN('')}} />
                        <Button title="Yes, I'm sure" onPress={confirmHandler} />
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const validPINStructure = (number) => {
    if (number.length != 4)
        return false
    const pattern = /^\d{4}$/

    return pattern.test(number)
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
        borderRadius: 10,
        padding: 15,
    },
    row: {
        flexDirection: "row",
        marginBottom: 15
    },
    textInput: {
        borderWidth: 1,
        borderColor: 'gray',
        borderRadius: 15,
        padding: 10,
        marginTop: 10,
        fontSize: 20,
        flex: 1
    },
    label: {
        fontSize: 18,
    },
    right: {
        width: "100%",
        justifyContent: 'flex-end',
        flexDirection: 'row'
    },
})

export default Confirmation