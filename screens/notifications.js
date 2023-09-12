import React, { Component } from 'react'
import { Text, View, StyleSheet, Modal, TouchableOpacity, FlatList } from "react-native"
import Button from "../components/button"
import Message from "../components/message"
import * as Contacts from 'expo-contacts'
import { Switch } from 'react-native-elements'
import { db, ref, set, child, get, onValue, off, update } from '../firebase'

export class Notifications extends Component {
    constructor(props) {
        super(props);
        this.state = {
            phoneNumber: this.props.route.params.phoneNumber,
            notifications: [],
            contacts: [],
            err: '',
            checked: true,
            numberNotif: this.props.route.params.numberNotif
        };
    }

    async componentDidMount() {
        const { phoneNumber, numberNotif } = this.state

        try {
            //Read notification
            this._readNotify(phoneNumber).then(snapshot => {
                const notify = snapshot.val() == 1
                this.setState({ checked: notify })

                this.props.navigation.setOptions({
                    headerRight: () => (
                        <>
                            <Text>{notify ? 'ON' : 'OFF'}</Text>
                            <Switch
                                value={notify}
                                onValueChange={this._changeNotify}
                            />
                        </>
                    ),
                });
            })

            //Get all transactions
            const snapshot = await this._readTransactions(phoneNumber)

            if (!snapshot.exists()) return

            const transactions = Object.entries(snapshot.val())

            const notifications = transactions.filter(transaction => {
                if (transaction[1].from) {
                    return true
                }
                return false
            })

            for (let i = notifications.length - 1; i > notifications.length - numberNotif - 1; i--) {
                const key = notifications[i][0]
                const updates = {}
                updates["view"] = 0
                await update(ref(db, '/vcards/' + phoneNumber + '/transactions/' + key), updates)
            }

            //Get all contacts
            const { status } = await Contacts.requestPermissionsAsync();

            this.setState({ notifications: notifications.reverse() })

            if (status === 'granted') {
                await this._loadContacts()
                this._convertNumbersToNames()
            }

        }
        catch (e) {
            this.setState({ err: e.toString() })
        }
    }

    render() {
        const { notifications, err } = this.state
        return (
            <>
                <Message type={'error'} message={err} clearMessage={() => this.setState({ err: '' })}/>
                <View style={styles.content}>
                    {notifications.length ?
                        <FlatList
                            data={notifications}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={[styles.notification, { flexDirection: 'row' }]} onPress={() => this._seeNotification(item)} >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemTitle}>{(item[1].name || item[1].from) + ' sent you ' + item[1].amount.toFixed(2) + ' €'}</Text>
                                        <Text style={styles.itemValue}>{this._getDateMsg(item[1].date, false)}</Text>
                                    </View>
                                    {(item[1].read == null || item[1].read == 1) && <View style={styles.blueball} />}
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item, idx) => idx}
                        />
                        :
                        <Text style={styles.noHistory}>Without notifications</Text>
                    }
                </View>
            </>
        )
    }

    _changeNotify = async (value) => {
        const { phoneNumber } = this.state
        try {
            this.setState({ checked: value })

            await this._updateNotify(phoneNumber, value ? 1 : 0)
    
            this.props.navigation.setOptions({
                headerRight: () => (
                    <>
                        <Text>{this.state.checked ? 'ON' : 'OFF'}</Text>
                        <Switch
                            value={this.state.checked}
                            onValueChange={this._changeNotify}
                        />
                    </>
                ),
            })
        }
        catch (e) {
            this.setState({ err: e.toString() })
        }
    }

    _seeNotification = async (item) => {
        const { phoneNumber, notifications } = this.state
        item[1].read = 0
        await this.setState({ notifications })
        
        try {
            //Update on DB
            const updates = {}
            updates["read"] = 0
            await update(ref(db, `/vcards/${phoneNumber}/transactions/${item[0]}`), updates)
        }
        catch (e) {
            this.setState({ err: e.toString() })
        }
        
        this.props.navigation.navigate('Last Transactions', { phoneNumber })
    }

    _readTransactions = (key) => {
        return get(child(ref(db), `vcards/${key}/transactions`))
    }

    _readNotify = (key) => {
        return get(child(ref(db), `vcards/${key}/notify`))
    }

    _updateNotify = (key, value) => {
        const updates = {}
        updates["notify"] = value
        return update(ref(db, `vcards/${key}`), updates)
    }

    _getDateMsg = (longDate) => {
        const dateInit = new Date(longDate)

        const dateNow = new Date()

        const seconds = Math.trunc((dateNow - dateInit) / 1000)
        if (seconds <= 59) {
            return seconds + ' seconds ago'
        }

        const minutes = Math.trunc((dateNow - dateInit) / (1000 * 60))
        if (minutes <= 59) {
            return minutes + ' minutes ago'
        }

        const hours = Math.trunc((dateNow - dateInit) / (1000 * 60 * 60))
        if (hours <= 24) {
            return hours + ' hours ago'
        }

        const days = Math.trunc((dateNow - dateInit) / (1000 * 60 * 60 * 24))
        return days + ' days ago'
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
        const { contacts, notifications } = this.state

        notifications.forEach(notification => {
            const phoneNumber = notification[1].to || notification[1].from
            contacts.forEach(contact => {
                contact.numbers.forEach(number => {
                    if (number == phoneNumber)
                        notification[1].name = contact.label
                })
            })
        })
        
        this.setState({ notifications })
    }
}

const styles = StyleSheet.create({
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
    },
    content: {
        marginHorizontal: '2%',
    },
    notification: {
        borderRadius: 10,
        padding: 10,
        paddingLeft: 15,
        margin: 10,
        backgroundColor: 'white'
    },
    itemTitle: {
        fontSize: 17,
        fontWeight: 'bold'
    },
    itemValue: {
        fontSize: 15,
        color: 'grey'
    },
    noHistory: {
        marginTop: 10,
        fontSize: 20,
        alignSelf: 'center'
    },
    alert: {
        color: 'white',
        fontSize: 15,
    },
    container: {
        margin: 10,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        padding: 15,
    },
    blueball: {
        backgroundColor: '#3ea6ff',
        height: 8,
        width: 8,
        borderRadius: 15,
        marginHorizontal: 15,
        alignSelf: 'center'
    }
})

export default Notifications
