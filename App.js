import React, { useState, useRef } from 'react';
import { StyleSheet} from 'react-native';
import {Box, NativeBaseProvider, Input, FlatList }  from 'native-base';
import { Actionsheet, Text }                 from 'native-base';



//////////////////////////////////
function get_new_id(length=12) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * 
              charactersLength));
 }
 return result;
}

//-- Components

///////////////////////////////////////////////
///////////////////////////////////////////////
function ChatArea(props){
  
  const ChatAreaRef                   = useRef();

  //--------------------------------------- -------------------
  function renderItem({item}){   

    return (
      <Box>
        {item.content["content"]}
      </Box>      
    ) 
  };

  return (
    <FlatList 
      ref={ChatAreaRef}
      onContentSizeChange={()=> ChatAreaRef.current.scrollToEnd()}
      extraData=    {props}
      data=         {props.chatData}
      keyExtractor= {(item)=> item.id}
      renderItem=   {renderItem}          
    />
  )
}

///////////////////////////////////////////////
///////////////////////////////////////////////
function InfoBar(props){
  return(
    <Box backgroundColor="white">
      <Text fontSize="lg" >{props.text}</Text>
    </Box>
  )
}

///////////////////////////////////////////////
///////////////////////////////////////////////
function CommandsActionsheet(props){

  return(
    <Actionsheet isOpen={props.openCmdActnSht} disableOverlay>
      <Actionsheet.Content>        
        {props.content}
      </Actionsheet.Content>
    </Actionsheet>
  )
}

///////////////////////////////////////////////
///////////////////////////////////////////////
function UserInput(props){
  return (
    <Input
      selectTextOnFocus=  {true}
      width=              "100%"
      bg=                 "white"
      onSubmitEditing=    {(evt)=> props.process_user_input(evt.nativeEvent.text)}
    />
  )
  
}

export default function App() {

  const [openCmdActnSht, setOpenCmdActnSht]         = useState(false);
  const [infobarText,    setInfobarText]            = useState("Text");
  const [cmdActnSht_Content, setCmdActnSht_Content] = useState([]);  

  const [chatData,    setChatData]                  = useState([]);

  // var ws = new WebSocket('ws://10.0.0.6:8080');  
  var ws = new WebSocket('ws://192.168.20.48:8080'); 
  ws.onopen = () => {

    //Log in
    let login_msg = {
      type: 'Login',
      content: {
        username: 'HaichiPapa',
        password: '12345678'
      }
    }
    ws.send(JSON.stringify(login_msg));
  }

  ws.onmessage = (e) => {
    // a message was received  
    let msg = JSON.parse(e.data);
    if (msg["type"]==="Chat"){
      add_chat_item("generic_message", msg["content"]);
    } else {
      //TODO: handle status messages
    }  
    
  };

  ws.onerror = (e) => {
    // an error occurred
    console.log(e.message);
  };

  ws.onclose = (e) => {
    // connection closed
    console.log(e.code, e.reason);
  };

  function generate_user_text_chat_item_content(data){
    return (
      <Box 
        style=                  {styles.chat_box_user} 
        borderRadius=           "10px" 
        borderBottomRightRadius="0px"
        borderColor=            "red.500"
        borderWidth=            "2px"
        >
        <Text>{data.content}</Text>
      </Box>
    )
  }

  function generate_generic_message_chat_item_content(data){
    
    return (
      <Box 
        style=                  {styles.chat_box_system} 
        borderRadius=           "10px" 
        borderBottomLeftRadius= "0px"
        borderColor=            "primary.600"
        borderWidth=            "3px"
      >
        <Text>{data}</Text>
      </Box>
    )
  }

  function add_chat_item(template, data){
    //get data and converts it to a chat item format.
    console.log(data);

    let content;
    if (template===null){
      return;     
    }  else if (template==="user_text"){
      content = generate_user_text_chat_item_content(data);      
    } else if (template==="generic_message"){      
      content = generate_generic_message_chat_item_content(data["text"])
    }

    let new_chat_item = {
      id:       get_new_id(),      
      content:  content
    };
    
    setChatData((chatData => [...chatData, new_chat_item]));
  }

  function link_handler(type, options){}

  function process_user_input(text){
    add_chat_item('user_text', {content: text});
    ws.send(text);
  }  

  return (
    <NativeBaseProvider>

      <Box          style={styles.container} safeArea>
        <ChatArea   chatData={chatData} link_handler={link_handler}/>
        <InfoBar    text={infobarText}/>        
        <UserInput  process_user_input={process_user_input}/>
      </Box>

      <CommandsActionsheet openCmdActnSht={openCmdActnSht} content={cmdActnSht_Content}/>      
    </NativeBaseProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: '#495057',            
  },
  chat_box_system: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    padding: 4,
    margin: 5    
  },
  chat_box_user: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
    padding: 4,
    margin: 5    
  }
});
