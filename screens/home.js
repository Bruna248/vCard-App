import React, { Component } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage'
import { db, ref, set, child, get, onValue, remove, off, update } from '../firebase'
import Button from "../components/button"
import Confirmation from "../components/confirmation"
import Message from "../components/message"
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import * as Contacts from 'expo-contacts'

export class Home extends Component {

    constructor(props) {
        super(props);
        this.state = {
            phoneNumber: this.props.route.params.phoneNumber,
            newUser: this.props.route.params.newUser || '',
            balance: 0,
            err: '',
            success: '',
            vault: 0,
            isVisible: false,
            numberNotif: 0,
            lastTransaction: null,
            contacts: [],
            transactions: [],
            available: 0,
        };
    }

    async componentDidMount() {
        const { phoneNumber } = this.state

        this.props.navigation.addListener('focus', () => this._updateData())

        this.props.navigation.addListener('blur', () => this.setState({ success: '', err: '', newUser: '' }))

        try {

            const { status } = await Contacts.requestPermissionsAsync();

            if (status === 'granted') {
                await this._loadContacts()
            }

            onValue(ref(db, '/vcards/' + phoneNumber), snapshot => {
                if (snapshot.exists()) {
                    const vcard = snapshot.val()
                    
                    let transactions = []
                    if (vcard.transactions)
                        transactions = Object.values(vcard.transactions)

                    let notifications = []
                    
                    notifications = transactions.filter(transaction => {
                        if (transaction.from && transaction.read && transaction.read == 1 && transaction.view && transaction.view == 1) {
                            return true
                        }
                        return false
                    })

                    this.props.navigation.setOptions({
                        headerRight: () => (
                            <TouchableOpacity onPress={this._notificationsHandler}>
                                <Ionicons name="notifications" size={27} color="black" />
                                {notifications.length != 0 && 
                                    <View style={styles.notificationCircle}>
                                        <Text style={styles.notification}>{notifications.length}</Text>
                                    </View>
                                }
                            </TouchableOpacity>
                        ),
                    });

                    this.setState({ balance: vcard.balance, numberNotif: notifications.length, transactions, lastTransaction: transactions[transactions.length-1] })
                    this._convertNumbersToNames()
                }
            })
        }
        catch(e) {
            this.setState({ err: e.toString() })
        }
    }

    componentWillUnmount() {
        const { phoneNumber } = this.state
        off(ref(db, '/vcards/' + phoneNumber))
    }

    render() {
        const { phoneNumber, balance, newUser, err, success, isVisible, lastTransaction, available, vault } = this.state

        return (
            <View style={styles.background}>
                <Confirmation isVisible={isVisible} message={'You are sure that you want to delete this vCard?'} confirmAction={this._checkPIN} setVisible={(prop) => this.setState({ isVisible: prop })} />
                <Message type={'error'} message={err} clearMessage={() => this.setState({ err: '' })}/>
                <Message type={'success'} message={success} clearMessage={() => this.setState({ success: '' })}/>
                <Message type={'info'} message={newUser} clearMessage={() => this.setState({ newUser: '' })}/>
                <View style={styles.container}>
                    <Text style={styles.text}>vCard Number</Text>
                    <Text style={styles.value}>{phoneNumber}</Text>
                </View>
                <View style={styles.container}>
                    <Text style={styles.text}>Balance</Text>
                    <Text style={styles.value}>{balance.toFixed(2) + ' €'}</Text>
                </View>
                <View style={{...styles.container, ...styles.row}}>
                    <View>
                        <MaterialCommunityIcons name="cash-multiple" size={35} color="black" />
                        <Text style={styles.value}>{available.toFixed(2) + ' €'}</Text>
                    </View>
                    <View>
                        <MaterialCommunityIcons name="safe" size={35} color="black" />
                        <Text style={styles.value}>{vault.toFixed(2) + ' €'}</Text>
                    </View>
                </View>
                <View style={[styles.container, {alignItems: 'stretch'}]}>
                    <Text style={styles.text}>Last transaction</Text>
                    {lastTransaction == null ? 
                        <Text style={[styles.value, {textAlign: 'center'}]}>Without transactions</Text>
                    :
                    <TouchableOpacity onPress={this._clickLastTransaction} style={{marginTop: 5}}>
                        <View style={lastTransaction.from ? styles.credit : styles.debit}>
                            <Text style={styles.itemTitle}>{lastTransaction.from ? 'From: ' + (lastTransaction.name || lastTransaction.from) : 'To: ' + (lastTransaction.name || lastTransaction.to)}</Text>
                            <Text style={styles.itemValue}>{this._getDateMsg(lastTransaction.date || 0, false)}</Text>
                            <Text style={{...styles.itemValue, textAlign: 'right'}}>{(lastTransaction.from ? '+' : '-') + (Number(lastTransaction.amount)).toFixed(2) + ' €'}</Text>
                        </View>
                    </TouchableOpacity>
                    }
                </View>
                <View style={styles.buttons}>
                    <Button title="Transfer" onPress={this._tranferHandler} />
                    <Button title="PiggyBank" onPress={this._handlerPiggyBank} />
                </View>
                <View style={styles.buttons}>
                    <Button title="Last Transactions" onPress={this._lastTransactionsHandler} />
                    <Button title="Delete vCard" onPress={this._deleteVCardHandler} />
                </View>
            </View>
        )
    }

    _clickLastTransaction = () => {
        const { phoneNumber } = this.state
        this.props.navigation.navigate('Last Transactions', { phoneNumber, isLastTransaction: true })
        this.setState({ err: '', success: '' })
    }

    _getDateMsg = (longDate, isFull) => {
        const date = new Date(longDate)

        if (isFull)
            return date.toISOString().split('T')[0].split('-').reverse().join('/') + ' ' + date.toISOString().split('.')[0].split('T')[1]
        
        return date.toISOString().split('T')[0].split('-').reverse().join('/')
    }

    _notificationsHandler = () => {
        const { phoneNumber, numberNotif } = this.state
        this.props.navigation.navigate('Notifications', { phoneNumber, numberNotif })
        this.setState({ err: '', success: '' })
    }

    _readTransactions = (key) => {
        return get(child(ref(db), `vcards/${key}/transactions`))
    }

    _deleteVCardHandler = () => {
        this.setState({ isVisible: true })
    }

    _checkPIN = async (pinToCheck) => {
        const { phoneNumber, balance, success } = this.state
        try {
            const snapshot = await this._readPIN(phoneNumber)
            if (snapshot.exists()) {
                const validPIN = snapshot.val()
                if (validPIN == pinToCheck) {
                    if (balance.toFixed(2) > 0) {
                        this.setState({ err: 'Spend all your money before deleting', success: '' })
                    }
                    else {
                        try {
                            await this._removeVCard(phoneNumber)
                            this.props.navigation.navigate('Login', { success: 'vCard deletion with success' })
                        }
                        catch (e) {
                            this.setState({ err: e.toString() })
                        }
                    }
                    return true
                }
            }
            return false
        }
        catch (e) {
            this.setState({ isVisible: false, err: e.toString() })
        }
    }

    _removeVCard = (key) => {
        let updates = {}
        updates["deleted"] = 1
        return update(ref(db, '/vcards/' + key), updates)
    }

    _readPIN = (key) => {
        return get(child(ref(db), `vcards/${key}/pin`))
    }

    _lastTransactionsHandler = () => {
        const { phoneNumber } = this.state
        this.props.navigation.navigate('Last Transactions', { phoneNumber })
        this.setState({ err: '', success: '' })
    }

    _tranferHandler = () => {
        const { phoneNumber, balance, vault } = this.state
        this.props.navigation.navigate('Transfer', { phoneNumber, balance, vault})
        this.setState({ err: '', success: '' })
    }

    _handlerPiggyBank = () => {
        this.props.navigation.navigate('PiggyBank', {...this.state})
    }

    _updateData = async () => {
        const { phoneNumber } = this.state

        if (this.props.route.params.success) {
            this.setState({ success: this.props.route.params.success })
            this.props.route.params.success = null
        }

        try {
            //Read vCard
            const snapshot = await this._readData(phoneNumber)
            if (!snapshot.exists()) {
                this.setState({ err: 'Error: Cannot find vCard in DB' })
                return
            }
            const vcard = snapshot.val()

            //Update local balance with remote balance
            this.setState({ balance: vcard.balance })

            //Read PiggyBank Vault Value
            const vaultValue = await this._getVault(phoneNumber)

            //Update local variables with received values
            this.setState({ available: vcard.balance - vaultValue, vault: vaultValue })

            //Get all contacts
            const { status } = await Contacts.requestPermissionsAsync();

            if (status === 'granted') {
                await this._loadContacts()
                this._convertNumbersToNames()
            }
        }
        catch(e) {
            this.setState({ err: e.toString() })
        }
    }

    _getVault = async (key) => {
        const val = await AsyncStorage.getItem(key) 
        return val ? Number(val) : 0
    }

    _readData = (key) => {
        return get(child(ref(db), `vcards/${key}`))
    }

    _refactorPhoneNumber = (phoneNumber) => {
        if (phoneNumber.length <= 9) return phoneNumber

        let phoneNumberOnlyNumbers = phoneNumber.replace(/[^\d]/gi, '')

        if (phoneNumberOnlyNumbers.startsWith('00351')) return phoneNumberOnlyNumbers.substring(5)

        if (phoneNumberOnlyNumbers.startsWith('351')) return phoneNumberOnlyNumbers.substring(3)

        return phoneNumberOnlyNumbers
    }

    _loadContacts = async () => {
        try {
            const { data: contacts } = await Contacts.getContactsAsync();
            const allContacts = []
            
            for (const item of contacts) {
                const contact = {
                    id: item.id,
                    label: item.name,
                    numbers: []
                }

                if (!item.phoneNumbers)
                    continue
                
                for (const element of item.phoneNumbers) {
                    const cleanNumber = this._refactorPhoneNumber(element.number)

                    if (this._validPhoneNumberStructure(cleanNumber) && !contact.numbers.includes(cleanNumber))
                        contact.numbers.push(cleanNumber)
                        
                }
                if (contact.numbers.length > 0) {
                    allContacts.push(contact)
                }
            }

            this.setState({contacts: allContacts})
        }
        catch(err) {
            this.setState({err: err.toString()})
        }
    }

    _validPhoneNumberStructure = (number) => {
        if (number.length != 9)
            return false
        const pattern = /^9\d{8}$/

        return pattern.test(number)
    }

    _convertNumbersToNames = () => {
        const { contacts, transactions } = this.state

        transactions.forEach(transaction => {
            const phoneNumber = transaction.to || transaction.from
            contacts.forEach(contact => {
                contact.numbers.forEach(number => {
                    if (number == phoneNumber)
                        transaction.name = contact.label
                })
            })
        })
        
        this.setState({ transactions })
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
        fontWeight: 'bold',
        textAlign: 'center'
    },
    value: {
        fontSize: 18
    },
    alert: {
        color: 'white',
        fontSize: 15,
    },
    buttons: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-evenly'
    },
    notification: {
        textAlign: 'center',
        color: 'white',
    },
    notificationCircle: {
        backgroundColor: 'red',
        borderRadius: 20,
        position: 'absolute',
        right: -6,
        top: -5,
        width: 20,
        height: 20,
    },
    credit: {
        borderRadius: 10,
        padding: 10,
        backgroundColor: '#ddff9e',
    },
    debit: {
        borderRadius: 10,
        padding: 10,
        backgroundColor: '#e3e3e3',
    },
    itemTitle: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    itemValue: {
        fontSize: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-around'
    }
})

export default Home