import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet, Image } from "react-native";

function Contact({item, onPress}) {
    var contacts = []

    for (let i = 0; i < item.numbers.length; i++) {
        if (item.numbers[i].isFiltered || item.numbers[i].isFiltered == null)
            contacts.push(
                <TouchableOpacity onPress={() => onPress(item, i)} key={i}>
                    <View style={[styles.multiItem, {borderColor: item.numbers[i].isVcard ? 'deepskyblue' : item.numbers[i].flag ? 'red' : 'black', flexDirection: 'row'}]}>
                        <Text style={[styles.itemValue, {alignSelf: 'center'}]}>{item.numbers[i].val}</Text>
                        {item.numbers[i].isVcard ? <Image style={[styles.logo, {right: 30}]} source={require('../assets/img/logo.png')} /> : null}
                    </View>
                    {item.numbers[i].flag && <Text style={{textAlign: 'center', color: 'red', fontSize: 17}}>This contact is not a vCard</Text>}
                </TouchableOpacity>
            )
    }
    return (
        <>
            {contacts.length == 0 ? null : (contacts.length == 1 ?
                <TouchableOpacity onPress={() => onPress(item, 0)}>
                    <View style={[styles.item, { borderColor: item.numbers[0].isVcard ? 'deepskyblue' : item.numbers[0].flag ? 'red' : 'black', flexDirection: 'row', justifyContent: 'space-between' }]}>
                        <View>
                            <Text style={styles.itemTitle}>{item.label}</Text>
                            <Text style={styles.itemValue}>{item.numbers[0].val}</Text>
                            {item.numbers[0].flag && <Text style={{textAlign: 'center', color: 'red', fontSize: 17}}>This contact is not a vCard</Text>}
                        </View>
                        {item.numbers[0].isVcard ? <Image style={styles.logo} source={require('../assets/img/logo.png')} /> : null}
                    </View>
                </TouchableOpacity>
                :
                <View style={styles.item}>
                    <Text style={styles.itemTitle}>{item.label}</Text>
                    {contacts}
                </View>
            )}
        </>
        
    )
}

const styles = StyleSheet.create({
    item: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        margin: 10,
        borderColor: 'black',
        borderStyle: 'solid',
    },
    multiItem: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        margin: 5,
        borderColor: 'black',
        borderStyle: 'solid',
    },
    itemTitle: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    itemValue: {
        fontSize: 20,
    },
    logo: {
        resizeMode: "contain",
        height: 40,
        alignSelf: 'center',
    }
})

export default Contact

