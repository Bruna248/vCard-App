import React, { Component } from 'react'
import { Text, View, StyleSheet, TouchableOpacity, Image, Modal, FlatList, TextInput } from "react-native"
import Button from "../components/button"
import Contact from "../components/contact"
import Message from "../components/message"
import * as Contacts from 'expo-contacts'
import { MaterialIcons } from '@expo/vector-icons'
import { db, ref, set, child, get, onValue, push, update } from '../firebase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Confirmation from "../components/confirmation"

export class Transfer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            phoneNumber: this.props.route.params.phoneNumber,
            balance: this.props.route.params.balance,
            available: 0,
            vault: this.props.route.params.vault,
            dest: "",
            destFilter: "",
            amount: "",
            err: "",
            err1: "",
            err2: "",
            showContacts: false, 
            contacts: [],
            isVisible: false,
            err3: "",
            err4: "",
            err5: "",
            showCreateContact: false,
            newContactName: "",
        };
    }

    componentDidMount() {
        const { balance, vault } = this.state
        this.setState({ available: balance - vault })
    }

    render() {
        const { dest, amount, available, err, err1, err2, err3, err4, err5, showContacts, contacts, isVisible, showCreateContact, newContactName, destFilter } = this.state
        return (
            <View style={styles.background}>
                <Confirmation isVisible={isVisible} setVisible={(prop) => this.setState({ isVisible: prop })} confirmAction={this._checkPIN} message={'Are you sure that you want to send ' + Number(amount).toFixed(2) + '€ to ' + dest + '?'} />
                <Modal visible={showContacts} animationType='slide'>
                    <MaterialIcons 
                        style={styles.modalClose}
                        name='close'
                        size={40}
                        onPress={() => this.setState({showContacts: false, destFilter: '', newContactName: ''})}
                    />
                    <View style={styles.modalContent}>
                        <FlatList
                            data={contacts}
                            renderItem={({ item }) => (
                                <Contact item={item} onPress={this._contactPressed} />
                            )}
                            keyExtractor={item => item.id}
                        />
                    </View>
                    <View style={[styles.row, {marginTop: 15}]}>
                        <TextInput
                            style={{...styles.textInput, marginHorizontal: 10}}
                            value={destFilter}
                            keyboardType = 'number-pad'
                            onChangeText={(text) => this._handlerPhoneNumberModal(text)}
                            textAlign="center"
                            placeholder='Phone number'
                            maxLength={9}
                        />
                        <TouchableOpacity onPress={this._handlerAddContact} style={{marginLeft: -10, paddingTop: 7}}>
                            <Image style={{width: 40, height: 40, alignSelf: 'center', marginLeft: 10}} source={require('../assets/img/AddContact.png')} />
                        </TouchableOpacity>
                    </View>
                </Modal>
                <Modal visible={showCreateContact} animationType='slide'>
                    <MaterialIcons 
                        style={styles.modalClose}
                        name='close'
                        size={40}
                        onPress={() => {this.setState({showCreateContact: false, err5: ''}); this._filterContacts(this.state.destFilter)}}
                    />
                    <View style={{marginHorizontal: 20}}>
                        <Text style={{fontSize: 20, fontWeight: 'bold', alignSelf: 'center'}}>Create Contact</Text>
                        <Text style={{fontSize: 18}}>Name:</Text>
                        <TextInput
                            style={{borderWidth: 1, padding: 10, borderRadius: 15, fontSize: 15, marginTop: 8, marginBottom: 15,borderColor: err3 ? 'red' : 'black'}}
                            value={newContactName}
                            onChangeText={(text) => this.setState({ newContactName: text, err3: '' })}
                            textAlign="center"
                            maxLength={25}
                        />
                        {err3 != "" && <Text style={{textAlign: 'center', color: 'red', fontSize: 15, marginTop: -10, marginBottom: 10}}>{err3}</Text>}
                        <Text style={{fontSize: 18}}>Phone:</Text>
                        <TextInput
                            style={{borderWidth: 1, padding: 10, borderRadius: 15, fontSize: 15, marginTop: 8, marginBottom: 15, borderColor: err4 ? 'red' : 'black'}}
                            value={destFilter}
                            keyboardType = 'number-pad'
                            onChangeText={(text) => this.setState({ destFilter: text, err4: '' })}
                            textAlign="center"
                            maxLength={9}
                        />
                        {err4 != "" && <Text style={{textAlign: 'center', color: 'red', fontSize: 15, marginTop: -10, marginBottom: 10}}>{err4}</Text>}
                        <Button title="Create" onPress={this._handlerAddContactOk}/>
                        {err5 != "" && <Text style={{textAlign: 'center', color: 'red', fontSize: 15, marginTop: 10, marginBottom: 10}}>{err5}</Text>}
                    </View>
                </Modal>
                <Message type={'error'} message={err} clearMessage={() => this.setState({ err: '' })}/>
                <View style={styles.container}>
                    <Text style={styles.text}>Balance Available</Text>
                    <Text style={styles.value}>{available.toFixed(2) + ' €'}</Text>
                </View>
                <View style={styles.container}>
                    <Text style={styles.text}>Destination Phone Number</Text>
                    <View style={styles.row}>
                        <TextInput
                            style={{...styles.textInput, borderColor: err1 ? 'red' : 'black'}}
                            keyboardType = 'numeric'
                            value={dest}
                            onChangeText={(text) => this._handlerPhoneNumber(text)}
                            textAlign="center"
                            maxLength={9}
                        />
                        <TouchableOpacity onPress={this._handlerContactList}>
                            <Image style={styles.icon} source={require('../assets/img/contacts.png')} />
                        </TouchableOpacity>
                    </View>
                    {err1 != "" && <Text style={{textAlign: 'center', color: 'red', fontSize: 15, marginTop: -10, marginBottom: 10}}>{err1}</Text>}
                    <Text style={styles.text}>Amount</Text>
                    <View style={styles.row}>
                        <TextInput
                            style={{...styles.textInput, borderColor: err2 ? 'red' : 'black'}}
                            keyboardType = 'numeric'
                            value={amount}
                            onChangeText={(text) => this._handlerAmount(text)}
                            textAlign="center"
                        />
                    </View>
                    {err2 != "" && <Text style={{textAlign: 'center', color: 'red', fontSize: 15, marginTop: -10, marginBottom: 10}}>{err2}</Text>}
                    <View style={styles.buttons}>
                        <Button title="Send" onPress={() => this._handleTransfer()} />
                    </View>
                </View>
            </View>
        )
    }

    _checkPIN = async (pinToCheck) => {
        const { phoneNumber, balance, vault, amount } = this.state
        const snapshot = await this._readPIN(phoneNumber)
        if (snapshot.exists()) {
            const validPIN = snapshot.val()
            if (validPIN == pinToCheck) {
                
                const autoVault = await this._getAutoVault(phoneNumber)
                if (autoVault == '1') {
                    if ((amount - Math.trunc(Number(amount))) != 0) {
                        let newVault = vault + 1 - (amount - Math.trunc(Number(amount)))
                        
                        if (Math.trunc(newVault * 100) < Math.trunc((balance - amount) * 100)) {
                            this._storeData(phoneNumber, newVault.toFixed(2))
                        }
                    }
                }

                //Write transactions in DB
                await this._writeTransactions()
                
                this.props.navigation.navigate('Home', { success: 'Transfer with success' })

                return true
            }
        }
        return false
    }

    _handlerAddContact = async () => {
        this.setState({ showCreateContact: true })
    }

    _handlerAddContactOk = async () => {
        const { destFilter, newContactName } = this.state

        this.setState({err5: ''})

        try {
            if (newContactName.trim() == '') {
                this.setState({ err3: 'The name is required' })
                return
            }
    
            if (!this._validPhoneNumberStructure(destFilter)) {
                this.setState({ err4: 'Invalid phone number structure' })
                return
            }
    
            const snapshot = await this._readData(destFilter)
            if (!snapshot.exists() || snapshot.val().deleted) {
                this.setState({ err4: 'Phone number not a vCard' })
                return
            }
    
            const contact = {
                [Contacts.Fields.FirstName]: newContactName,
                [Contacts.Fields.ContactType]: Contacts.ContactTypes.Person,
                [Contacts.Fields.PhoneNumbers]: [
                    { 
                        number: '+351' + destFilter,
                        digits: destFilter,
                        countryCode: "+351",
                        id: (new Date()).getTime() + "",
                        label: 'main',
                    }
                ]
            }
            await Contacts.addContactAsync(contact);
    
            const { status } = await Contacts.requestPermissionsAsync();
    
            if (status === 'granted') {
                await this._loadContacts()
                this._filterContacts(destFilter)
                this._highlightContacts()
                this.setState({ showContacts: true, showCreateContact: false, dest: destFilter })
            }
        }
        catch (e) {
            this.setState({ err5: e.toString()})
        }

    }

    _readPIN = (key) => {
        return get(child(ref(db), `vcards/${key}/pin`))
    }

    _handlerContactList = async () => {
        const { status } = await Contacts.requestPermissionsAsync();

        if (status === 'granted') {
            await this._loadContacts()
            this._filterContacts(this.state.destFilter)
            this._highlightContacts()
            this.setState({ showContacts: true })
        }
    }

    _filterContacts = (text) => {
        const { contacts } = this.state

        contacts.forEach((contact) => {
            for (let i = 0; i < contact.numbers.length; i++) {
                if (String(contact.numbers[i].val).startsWith(text)) {
                    contact.numbers[i].isFiltered = true
                }
                else {
                    contact.numbers[i].isFiltered = false
                }
            }
        })

        this.setState({ contacts: contacts })
    }

    _contactPressed = async (contact, idx) => {
        const snapshot = await this._readData(contact.numbers[idx].val)
        if (!snapshot.exists() || snapshot.val().deleted) {
            contact.numbers[idx].flag = true
            this.setState({ contacts: this.state.contacts })
            return
        }
        this._handlerPhoneNumber(contact.numbers[idx].val)
        this.setState({showContacts: false})
    }

    _handleTransfer = async () => {
        const { phoneNumber, available, amount, balance, dest, vault } = this.state
        if (!this._validPhoneNumberStructure(dest)) {
            this.setState({ err1: 'Invalid phone number structure' })
            return
        }
        if (dest.trim() == phoneNumber.trim()) {
            this.setState({ err1: 'Invalid phone number' })
            return
        }
        if (!this._validAmount(amount) || amount.trim() === '' || amount == 0) {
            this.setState({ err2: 'Invalid amount' })
            return
        }

        try {
            //Read latest balance from DB
            const snapshot = await this._readData(phoneNumber)
            if (snapshot.exists())
                this.setState({ balance: snapshot.val().balance, available: snapshot.val().balance - vault })

            if (Math.trunc(amount * 100) > 0 && Math.trunc(available * 100) - Math.trunc(amount * 100) >= 0) {
                
                const destSnapshot = await this._readData(dest)
                if (!destSnapshot.exists()) {
                    this.setState({ err1: 'The phone number is not a vCard' })
                    return
                }

                this.setState({ isVisible: true })
                
            }
            else {
                this.setState({ err2: 'Not enough balance available' })
            }
        }
        catch (e) {
            this.setState({ err: e.toString() })
        }
    }

    _validAmount = (number) => {
        const pattern = /^\d*(\.\d{0,2})?$/

        return pattern.test(number)
    }

    _handlerAmount = (text) => {
        this.setState({ err2: '', amount: text })
    }

    _validPhoneNumberStructure = (number) => {
        if (number.length != 9)
            return false
        const pattern = /^9\d{8}$/

        return pattern.test(number)
    }

    _handlerPhoneNumber = (text) => {
        this.setState({ err1: '', dest: text })
    }

    _handlerPhoneNumberModal = (text) => {
        this.setState({ destFilter: text })
        this._filterContacts(text)
    }

    _writeTransactions = async () => {
        try {
            const { phoneNumber, dest, amount, balance } = this.state
            const updates = {}
            const now = new Date()

            //Add transaction to source
            const listRefS = ref(db, `vcards/${phoneNumber}/transactions`)
            const newListRefS = push(listRefS)
            await set(newListRefS, {          
                to: dest,
                amount: Number(amount),
                date: now.getTime(),
            })
            
            updates['balance'] = balance - amount
            await update(ref(db, '/vcards/' + phoneNumber), updates)

            //Add transaction to destiny
            const listRefR = ref(db, `vcards/${dest}/transactions`)
            const newListRefR = push(listRefR)

            const data = {    
                from: phoneNumber,
                amount: Number(amount),
                date: now.getTime(),
            }

            const snapshot = await this._readNotify(dest)
            if (snapshot.exists()) {
                const notify = snapshot.val() == 1
                if (notify) {
                    data["read"] = 1
                    data["view"] = 1

                    const result = await this._readToken(dest)
                    if (result.exists()) {
                        const token = result.val()
                        await this._sendPushNotification(token, amount, phoneNumber)
                    }
                }
            }

            await set(newListRefR, data)

            updates['balance'] = (await this._readData(dest)).val().balance + Number(amount)
            await update(ref(db, '/vcards/' + dest), updates)
        }
        catch (e) {
            this.setState({ err: e.toString() })
        }
    }

    _readToken = (key) => {
        return get(child(ref(db), `vcards/${key}/token`))
    }

    _readNotify = (key) => {
        return get(child(ref(db), `vcards/${key}/notify`))
    }

    _writeData = (key, val) => {
        return set(ref(db, `vcards/${key}`), val)
    }

    _readData = (key) => {
        return get(child(ref(db), `vcards/${key}`))
    }

    _storeData = async (key, value) => {
        try {
            await AsyncStorage.setItem(key, value)
        } catch (e) {
            this.setState({ err: e.toString() })
        }
    }

    _getAutoVault = async (key) => {
        return await AsyncStorage.getItem(key + '-autovault')
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
            console.log(contacts.reverse())
            const allContacts = []

            for (const item of contacts) {
                const contact = {
                    id: item.id,
                    label: item.name,
                    numbers: []
                }
                
                if (!item.phoneNumbers)
                    continue;
                    
                    const map = []
                for (const element of item.phoneNumbers) {
                    const cleanNumber = this._refactorPhoneNumber(element.number)
                    
                    if (this._validPhoneNumberStructure(cleanNumber) && !map.includes(cleanNumber)) {
                        contact.numbers.push({ val: cleanNumber })
                        map.push(cleanNumber)
                    }
                }
                if (contact.numbers.length > 0) {
                    allContacts.push(contact)
                }
            }

            this.setState({ contacts: allContacts.sort((a, b) => {
                if (a.label < b.label) return -1
                if (a.label > b.label) return 1
                return 0
            })})
        }
        catch(err) {
            this.setState({err: err.toString()})
        }
    }

    _highlightContacts = async () => {
        const { contacts, dest } = this.state
        for (const contact of contacts) {
            for (let i = 0; i < contact.numbers.length; i++) {
                const snapshot = await this._readData(contact.numbers[i].val)
                contact.numbers[i].isVcard = snapshot.exists() && !snapshot.val().deleted
            }
        }
        this.setState({ contacts })
    }

    _sendPushNotification = (token, amount, source) => {
        const message = {
          to: token,
          title: 'You have received a gift!',
          body: `The number ${source} just sent you ${(Number(amount)).toFixed(2)} €.`,
        };
      
        return fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
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
        marginTop: 10,
        marginHorizontal: 10
    },
    buttons: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-evenly'
    },
    textInput: {
        flex:1,
        borderWidth: 1,
        borderColor: 'gray',
        borderRadius: 15,
        padding: 10,
        marginBottom: 20,
        fontSize: 20
    },
    alert: {
        color: 'white',
        fontSize: 15,
    },
    icon: {
        resizeMode: "contain",
        height: 50,
        width: 50,
        marginLeft: 10,
    },
    modalContent: {
        marginHorizontal: '2%',
        flex: 1
    },
    modalClose: {
        alignSelf: 'center',
        margin: 10
    },
})

export default Transfer
