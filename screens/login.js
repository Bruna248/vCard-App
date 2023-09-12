import React, { Component } from 'react'
import { Text, TextInput, View, StyleSheet, Image, TouchableOpacity } from "react-native"
import Button from "../components/button"
import Message from "../components/message"
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage'
import { db, ref, set, child, get, push, update } from '../firebase'
import { registerForPushNotificationsAsync } from "../components/notifications"

export class Login extends Component {

    constructor(props) {
        super(props);
        this.state = {
            phoneNumber: "",
            pin: "",
            err: "",
            err1: "",
            err2: "",
            success: "",
        };
    }

    async componentDidMount() {
        try {
            this.props.navigation.addListener('focus', () => {
                if (this.props.route.params && this.props.route.params.success) {
                    this.setState({ success: this.props.route.params.success })
                }
            })

            const lastSession = await this._getLastLogin()
            this.setState({ phoneNumber: lastSession })
        }
        catch (e) {
            this.setState({ err: e.toString() })
        }
    }

    render() {
        const { phoneNumber, pin, err1, err2, err, success } = this.state
        return (
            <SafeAreaView style={styles.background}>
                <Message type={'error'} message={err} clearMessage={() => this.setState({ err: '' })}/>
                <Message type={'success'} message={success} clearMessage={() => this.setState({ success: '' })}/>
                <View style={styles.container}>
                    <Image style={styles.logo} source={require('../assets/img/logo.png')} />
                    <View style={{ width: '100%' }}>
                        <Text style={styles.label}>Phone:</Text>
                        <View style={styles.row}>
                            <TextInput
                                style={{...styles.textInput, borderColor: err1 ? 'red' : 'black'}}
                                value={phoneNumber}
                                keyboardType = 'number-pad'
                                onChangeText={(text) => this._handlerPhoneNumber(text)}
                                textAlign="center"
                                maxLength={9}
                                />
                        </View>
                        {err1 != "" && <Text style={{textAlign: 'center', color: 'red', fontSize: 15}}>{err1}</Text>}
                        <Text style={styles.label}>PIN:</Text>
                        <View style={styles.row}>
                            <TextInput
                                style={{...styles.textInput, borderColor: err2 ? 'red' : 'black'}}
                                value={pin}
                                keyboardType = 'number-pad'
                                secureTextEntry={true}
                                onChangeText={(text) => this._handlerPIN(text)}
                                textAlign="center"
                                maxLength={4}
                                />
                        </View>
                        {err2 != "" && <Text style={{textAlign: 'center', color: 'red', fontSize: 15}}>{err2}</Text>}
                    </View>
                    <View style={styles.right}>
                        <Button onPress={this._ok} title="OK"/>
                    </View>
                </View>
            </SafeAreaView>
        )
    }

    _handlerPhoneNumber = (text) => {
        this.setState({ err1: "", phoneNumber: text, success: '' })
    }

    _handlerPIN = (text) => {
        this.setState({ err2: "", pin: text, success: '' })
    }

    _validPhoneNumberStructure = (number) => {
        if (number.length != 9)
            return false
        const pattern = /^9\d{8}$/

        return pattern.test(number)
    }

    _ok = async () => {
        const { phoneNumber, pin, err1, err2 } = this.state
        if (!this._validPhoneNumberStructure(phoneNumber)) {
            this.setState({ err1: 'Invalid phone number structure' })
            return
        }

        if (pin.length != 4) {
            this.setState({ err2: 'Invalid PIN structure' })
            return
        }

        try {
            const snapshot = await this._readData(phoneNumber)

            if (snapshot.exists()) {
                const vcard = snapshot.val()
                if (vcard.deleted) {
                    this.setState({ err: 'That phone number cannot be taken' })
                    return
                }

                //Try Login

                if (vcard.pin === pin) {
                    //Login Success

                    const token = await registerForPushNotificationsAsync()
                    if (token) {
                        const updates = {}
                        updates["token"] = token
                        await update(ref(db, '/vcards/' + phoneNumber), updates)
                    }

                    //Get Vault from memory or return 0
                    const newVault = await this._getVault(phoneNumber)
                    //Store Vault in memory
                    await this._storeData(phoneNumber, newVault)
                    //Store Last Session in memory
                    this._storeData('lastSession', phoneNumber)

                    const active = await this._getAutoVault(phoneNumber)
                    this._storeData(phoneNumber + '-autovault', active ? active : '0')

                    //Move to Home page
                    this.props.navigation.navigate('Home', { phoneNumber, newUser: '' })
                    this.setState({ err: '', pin: '', success: '' })
                }
                else {
                    //Wrong Login PIN
                    this.setState({ err2: 'Wrong PIN' })
                }
            }
            else {
                //Try Register
                const data = { balance: 0, pin }

                const token = await registerForPushNotificationsAsync()
                if (token) {
                    data.token = token
                }

                //Store credentials in DB
                await this._writeData(phoneNumber, data)

                //Store Initial Vault value in memory
                await this._storeData(phoneNumber, '0')
                await this._storeData(phoneNumber + '-autovault', '0')

                //Store Last Session in memory
                this._storeData('lastSession', phoneNumber)

                //Move to Home page
                this.props.navigation.navigate('Home', { phoneNumber, newUser: 'Welcome to the vCard community' })
                this.setState({ pin: '', err: '', success: '' })
            }
        }
        catch (e) {
            this.setState({ err: e.toString() })
            return
        }
    }

    _getAutoVault = async (key) => {
        return await AsyncStorage.getItem(key + '-autovault')
    }

    _getLastLogin = async () => {
        return AsyncStorage.getItem('lastSession')
    }

    _storeData = async (key, value) => {
        try {
            await AsyncStorage.setItem(key, value)
        } catch (e) {
            this.setState({ err: e.toString() })
            return
        }
    }

    _writeData = (key, val) => {
        return set(ref(db, `vcards/${key}`), val)
    }

    _readData = (key) => {
        return get(child(ref(db), `vcards/${key}`))
    }

    _getVault = async (key) => {
        try {
            const value = await AsyncStorage.getItem(key)
            if(value !== null) {
                return value
            }
            return '0'
        } catch(e) {
            return '0'
        }
    }
}

const styles = StyleSheet.create({
    background: {
        width: "100%",
        height: "100%",
        backgroundColor: "rgb(240,240,240)",
        justifyContent: "center",
    },
    container: {
        margin: 10,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: 'center',
        backgroundColor: "white",
        borderRadius: 10,
        padding: 20,
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
    logo: {
        resizeMode: "contain",
        height: 140,
        marginBottom: 30
    },
    label: {
        fontSize: 18,
    },
    right: {
        width: "100%",
        alignItems: 'flex-end'
    },
    alert: {
        color: 'white',
        fontSize: 15,
    },
});

export default Login