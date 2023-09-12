import React, { Component } from 'react'
import { Text, View, StyleSheet, TextInput } from "react-native"
import Button from "../components/button"
import Message from "../components/message"
import AsyncStorage from '@react-native-async-storage/async-storage'
import { db, ref, set, child, get } from '../firebase'
import { Switch } from 'react-native-elements'

export class PiggyBank extends Component {
    constructor(props) {
        super(props);
        this.state = {
            phoneNumber: this.props.route.params.phoneNumber,
            balance: this.props.route.params.balance,
            available: this.props.route.params.available,
            vault: this.props.route.params.vault,
            amount: '',
            error: '',
            err: '',
            checked: true
        };
    }

    componentDidMount() {
        const { phoneNumber } = this.state
        this._getAutoVault(phoneNumber).then(autoVault => {
            this.setState({ checked: autoVault === '1' })
            
            this.props.navigation.setOptions({
                headerRight: () => (
                    <>
                        <Text>{autoVault === '1' ? 'ON' : 'OFF'}</Text>
                        <Switch
                            value={autoVault === '1'}
                            onValueChange={this._changeAutoVault}
                        />
                    </>
                ),
            });
        })
        
        if (this.state.balance === 0) this.setState({ balance: 1 })
    }

    render() {
        const { vault, balance, amount, available, error, err } = this.state
        return (
            <View>
                <Message type={'error'} message={error} clearMessage={() => this.setState({ error: '' })}/>
                <View style={styles.container}>
                    <Text style={styles.text}>Balance Available</Text>
                    <Text style={styles.value}>{available.toFixed(2) + ' €'}</Text>
                </View>
                <View style={styles.container}>
                    <Text style={styles.text}>Balance On Saving ({(vault/balance*100).toFixed(1)}%)</Text>
                    <Text style={styles.value}>{vault.toFixed(2) + ' €'}</Text>
                </View>
                <View style={{...styles.container, paddingHorizontal: 30 }}>
                    <Text style={styles.text}>Amount</Text>
                    <TextInput
                            style={{...styles.textInput, borderColor: err ? 'red' : 'black'}}
                            keyboardType = 'numeric'
                            value={amount}
                            onChangeText={(text) => this.setState({ amount: text, error: '', err: '' })}
                            textAlign="center"
                        />
                    {err != "" && <Text style={{textAlign: 'center', color: 'red', fontSize: 15}}>{err}</Text>}
                    <View style={styles.buttons}>
                        <Button title="Deposit" onPress={() => this._handlerPiggyBank('deposit')} />
                        <Button title="Withdraw" onPress={() => this._handlerPiggyBank('withdraw')} />
                    </View>
                </View>
            </View>
        )
    }

    _changeAutoVault = (value) => {
        const { phoneNumber, checked } = this.state
        this.setState({ checked: value }, async () => {
            await this._storeData(phoneNumber + '-autovault', value ? '1' : '0')
    
            this.props.navigation.setOptions({
                headerRight: () => (
                    <>
                        <Text>{this.state.checked ? 'ON' : 'OFF'}</Text>
                        <Switch
                            value={this.state.checked}
                            onValueChange={this._changeAutoVault}
                        />
                    </>
                ),
            });
        })
    }

    _getAutoVault = async (key) => {
        return await AsyncStorage.getItem(key + '-autovault')
    }

    _storeData = async (key, value) => {
        try {
            await AsyncStorage.setItem(key, value)
        } catch (e) {
            this.setState({ error: e.toString() })
        }
    }

    _handlerPiggyBank = async (type) => {
        const { phoneNumber, vault, amount } = this.state

        try {
            const snapshot = await this._readData(phoneNumber)
            let balance = 0
            if (snapshot.exists())
                balance = snapshot.val().balance
            
            const amountValue = +parseFloat(amount).toFixed(2)

            const oldVault = +parseFloat(vault).toFixed(2)

            let newVault

            switch (type) {
                case 'deposit':
                    newVault = oldVault + amountValue
                    if (amountValue > 0 && newVault <= balance) {
                        await this._storeData(phoneNumber, newVault.toFixed(2))
                        this.setState({ available: balance - newVault, vault: newVault })
                    }
                    else {
                        this.setState({ err: 'Invalid Amount' })
                    }
                    break;
            
                default:
                    newVault = oldVault - amountValue
                    if (amountValue > 0 && newVault >= 0) {
                        await this._storeData(phoneNumber, newVault.toFixed(2))
                        this.setState({ available: Math.round((balance - newVault)*100)/100, vault: Math.round(newVault*100)/100 })
                    }
                    else {
                        this.setState({ err: 'Invalid Amount' })
                    }
            }
        }
        catch (e) {
            this.setState({ error: e.toString() })
        }
    }

    _readData = (key) => {
        return get(child(ref(db), `vcards/${key}`))
    }
}

const styles = StyleSheet.create({
    container: {
        margin: 10,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
        borderRadius: 10,
        padding: 15,
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    value: {
        fontSize: 18
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center'
    },
    buttons: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        marginTop: 10
    },
    textInput: {
        width: '100%',
        borderWidth: 1,
        borderColor: 'gray',
        borderRadius: 15,
        padding: 10,
        margin: 10,
        fontSize: 20,
    },
})

export default PiggyBank
