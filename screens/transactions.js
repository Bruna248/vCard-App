import React, { Component } from 'react'
import { Text, View, StyleSheet, Modal, TouchableOpacity, FlatList } from "react-native"
import Button from "../components/button"
import * as Contacts from 'expo-contacts'
import { MaterialIcons } from '@expo/vector-icons'
import Confirmation from "../components/confirmation"
import Message from "../components/message"
import { db, ref, set, child, get, onValue, off } from '../firebase'
import DateTimePicker from '@react-native-community/datetimepicker'

export class Transactions extends Component {
    constructor(props) {
        super(props);
        this.state = {
            phoneNumber: this.props.route.params.phoneNumber,
            transactions: [],
            contacts: [],
            err: '',
            showDetails: false,
            transaction: {},
            dateLong: 0,
            sortedTransactions: {},
            sortBy: 0,
            startDate: null,
            endDate: null,
            isStartDate: null,
            showDatePicker: false,
            type: 0
        };
    }

    async componentDidMount() {
        const { phoneNumber } = this.state

        try {
            //Get all transactions
            const snapshot = await this._readTransactions(phoneNumber)

            if (snapshot.exists()) {
                const transactions = Object.values(snapshot.val())

                this.setState({ startDate: transactions[0].date, endDate: transactions[transactions.length-1].date })
    
                //Get all contacts
                const { status } = await Contacts.requestPermissionsAsync();
    
                this.setState({ transactions: transactions, sortedTransactions: [...transactions].reverse() })
    
                if (status === 'granted') {
                    await this._loadContacts()
                    this._convertNumbersToNames()
                }

                if (this.props.route.params.isLastTransaction) {
                    this.setState({ transaction: transactions[transactions.length-1], dateLong: transactions[transactions.length-1].date, showDetails: true })
                }
            }
        }
        catch (e) {
            this.setState({ err: e.toString() })
        }
    }

    render() {
        const { transactions, err, sortedTransactions, sortBy, startDate, endDate, isStartDate, showDatePicker, type, showDetails, transaction, dateLong } = this.state
        return (
            <>
                <Modal visible={showDetails} animationType='slide'>
                    <MaterialIcons 
                        style={styles.modalClose}
                        name='close'
                        size={40}
                        onPress={() => this.setState({showDetails: false})}
                    />
                    <View style={styles.modalContent}>
                        <View style={[styles.container, { backgroundColor: transaction.from ? '#ddff9e' : '#e3e3e3' }]}>
                            <View style={{flexDirection: 'row', marginBottom: 5}}>
                                <Text style={styles.itemTitle}>Name: </Text>
                                <Text style={styles.itemValue}>{transaction.name || '<unknown>'}</Text>
                            </View>
                            <View style={{flexDirection: 'row', marginBottom: 5}}>
                                <Text style={styles.itemTitle}>Phone Number: </Text>
                                <Text style={styles.itemValue}>{transaction.to || transaction.from}</Text>
                            </View>
                            <View style={{flexDirection: 'row', marginBottom: 5}}>
                                <Text style={styles.itemTitle}>Type: </Text>
                                <Text style={styles.itemValue}>{transaction.to ? 'Debit' : 'Credit'}</Text>
                            </View>
                            <View style={{flexDirection: 'row', marginBottom: 5}}>
                                <Text style={styles.itemTitle}>Amount: </Text>
                                <Text style={styles.itemValue}>{Number(transaction.amount).toFixed(2) + ' €'}</Text>
                            </View>
                            <View style={{flexDirection: 'row', marginBottom: 5}}>
                                <Text style={styles.itemTitle}>Date: </Text>
                                <Text style={styles.itemValue}>{this._getDateMsg(dateLong, true)}</Text>
                            </View>
                        </View>
                    </View>
                </Modal>
                {showDatePicker && (
                    <DateTimePicker
                        value={isStartDate ? new Date(startDate) : new Date(endDate)}
                        onChange={this._onChangeDate}
                        maximumDate={isStartDate ? new Date(endDate) : null}
                        minimumDate={isStartDate ? null : new Date(startDate)}
                    />
                )}
                <Message type={'error'} message={err} clearMessage={() => this.setState({ err: '' })}/>
                <View style={styles.content}>
                    <View style={styles.row}>
                        <TouchableOpacity onPress={this._sortByDate} style={[styles.smallButton, { backgroundColor: sortBy < 2 ? 'lightgrey' : 'white' }]}>
                            <Text style={styles.textButton}>Date{sortBy == 0 ? ' (DESC)' : (sortBy == 1 ? ' (ASC)' : '')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={this._sortByAmount} style={[styles.smallButton, { backgroundColor: sortBy > 1 ? 'lightgrey' : 'white' }]}>
                            <Text style={styles.textButton}>Amount{sortBy == 2 ? ' (DESC)' : (sortBy == 3 ? ' (ASC)' : '')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={this._sortByType} style={[styles.smallButton, { backgroundColor: 'lightgrey' }]}>
                            <Text style={styles.textButton}>{type == 0 ? 'Type: Any' : (type == 1 ? 'Type: Credit' : 'Type: Debit')}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.row}>
                        <TouchableOpacity onPress={this._startDate} style={styles.smallButton}>
                            <Text style={styles.textButton}>From: {this._getDateMsg(startDate)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={this._endDate} style={styles.smallButton}>
                            <Text style={styles.textButton}>To: {this._getDateMsg(endDate)}</Text>
                        </TouchableOpacity>
                    </View>
                    {sortedTransactions.length ?
                        <FlatList
                            data={sortedTransactions}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => this.setState({ transaction: item, showDetails: true, dateLong: item.date })}>
                                    <View style={item.from ? styles.credit : styles.debit}>
                                        <Text style={styles.itemTitle}>{item.from ? 'From: ' + (item.name || item.from) : 'To: ' + (item.name || item.to)}</Text>
                                        <Text style={styles.itemValue}>{this._getDateMsg(item.date, false)}</Text>
                                        <Text style={{...styles.itemValue, textAlign: 'right'}}>{(item.from ? '+' : '-') + item.amount.toFixed(2) + ' €'}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            style={{height: '85%'}}
                            keyExtractor={(item, idx) => idx}
                        />
                        :
                        <Text style={styles.noHistory}>No History</Text>
                    }
                </View>
            </>
        )
    }

    _sortByType = () => {
        const { type, sortBy } = this.state
        this.setState({type: type + 1 == 3 ? 0 : type + 1})
        this._filter(type + 1 == 3 ? 0 : type + 1)
        this._sort(sortBy)
    }

    _startDate = () => {
        this.setState({isStartDate: true, showDatePicker: true})
    }

    _endDate = () => {
        this.setState({isStartDate: false, showDatePicker: true})
    }

    _onChangeDate = (event, selectedDate) => {
        const { isStartDate, type, sortBy } = this.state

        this.setState({showDatePicker: false})

        if (!selectedDate) return
        
        if (isStartDate) {
            selectedDate.setHours(0, 0, 0, 0)
            this.setState({ startDate: selectedDate.getTime() })
        }
        else {
            selectedDate.setHours(23, 59, 59, 999)
            this.setState({ endDate: selectedDate.getTime() })
        }
        this._filter(type)
        this._sort(sortBy)
    }

    _filter = (type) => {
        const { transactions, startDate, endDate, sortedTransactions } = this.state
        sortedTransactions.splice(0, sortedTransactions.length)
        switch (type) {
            case 1: //Credit
                transactions.forEach((elem) => {
                    if (elem.from != null && elem.date >= startDate && elem.date <= endDate)
                        sortedTransactions.push(elem)
                })
                break;
            case 2: //Debit
                transactions.forEach((elem) => {
                    if (elem.to != null && elem.date >= startDate && elem.date <= endDate)
                        sortedTransactions.push(elem)
                })
                break;
            default: //Any
                transactions.forEach((elem) => {
                    if (elem.date >= startDate && elem.date <= endDate)
                        sortedTransactions.push(elem)
                })
        }
        this.setState({ sortedTransactions })
    }

    _sort = (sortBy) => {
        const { sortedTransactions } = this.state
        
        switch (sortBy) {
            case 0: //DATE DESC
                this.setState({ sortedTransactions: sortedTransactions.sort((e1, e2) => e2.date - e1.date) })
                break;
            case 1: //DATE ASC
                this.setState({ sortedTransactions: sortedTransactions.sort((e1, e2) => e1.date - e2.date) })
                break;
            case 2://AMOUNT DESC
                this.setState({ sortedTransactions: sortedTransactions.sort((e1, e2) => e2.amount - e1.amount) })
                break;
            default://AMOUNT ASC
                this.setState({ sortedTransactions: sortedTransactions.sort((e1, e2) => e1.amount - e2.amount) })
                break;
        }
    }

    _sortByDate = () => {
        const { sortBy, type } = this.state

        this.setState({ sortBy: sortBy == 0 ? 1 : 0 })
        this._filter(type)
        this._sort(sortBy == 0 ? 1 : 0)
    }

    _sortByAmount = () => {
        const { sortBy, type } = this.state

        this.setState({ sortBy: sortBy == 2 ? 3 : 2 })
        this._filter(type)
        this._sort(sortBy == 2 ? 3 : 2)
    }

    _readTransactions = (key) => {
        return get(child(ref(db), `vcards/${key}/transactions`))
    }

    _getDateMsg = (longDate, isFull) => {
        const date = new Date(longDate)

        if (isFull)
            return date.toISOString().split('T')[0].split('-').reverse().join('/') + ' ' + date.toISOString().split('.')[0].split('T')[1]
        
        return date.toISOString().split('T')[0].split('-').reverse().join('/')
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
    credit: {
        borderRadius: 10,
        padding: 10,
        margin: 10,
        backgroundColor: '#ddff9e'
    },
    debit: {
        borderRadius: 10,
        padding: 10,
        margin: 10,
        backgroundColor: '#e3e3e3'
    },
    itemTitle: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    itemValue: {
        fontSize: 20,
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
        borderRadius: 10,
        padding: 15,
    },
    modalContent: {
        height: '90%',
        marginHorizontal: '2%',
    },
    modalClose: {
        alignSelf: 'center',
        margin: 10
    },
    smallButton: {
        flex: 1,
        padding: 5,
        margin: 5,
        borderRadius: 10,
        backgroundColor: 'white',
        borderWidth: 1,
        alignItems: 'center'
    },
    textButton: {
        fontSize: 15,
    },
})

export default Transactions
