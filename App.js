import React, { useState, useRef }                  from 'react';
import { StyleSheet}                                from 'react-native';
import {Box, NativeBaseProvider, Input, FlatList, Button, FormControl, Stack }  from 'native-base';
import { Actionsheet, Text, Modal }                 from 'native-base';
import Markdown                                     from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEBUG = false;
const CLEAR_STORAGE = true;

//https://www.npmjs.com/package/react-native-markdown-display
//////////////////////////////////
function get_new_id(length=12) {
  //Generate a random 12 char id (String)
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
  //Displays the communications with the server.
  
  const ChatAreaRef = useRef();
  
  function renderItem({item}){    
    return (
      <Box>{item.content}</Box>      
    ) 
  };

  return (
    <FlatList 
      ref=                {ChatAreaRef}
      onContentSizeChange={()=> ChatAreaRef.current.scrollToEnd()}
      extraData=          {props}
      data=               {props.chatData}
      keyExtractor=       {(item)=> item.id}
      renderItem=         {renderItem}          
    />
  )
}

///////////////////////////////////////////////
///////////////////////////////////////////////
function InfoBar(props){
  //Displays data such as health points.
  return(
    <Box backgroundColor="white">
      <Text fontSize="lg">Health: {props.text}</Text>
    </Box>
  )
}

///////////////////////////////////////////////
///////////////////////////////////////////////
function CommandsActionsheet(props){
  //Displays a pressable list of commands.
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
  //Where the user types in commands.
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

  const [showLoginModal, setShowLoginModal]         = useState(false);
  const [username, setUsername]                     = useState("");
  const [password, setPassword]                     = useState("");  
  const [isLoggedIn, setIsLoggedIn]                 = useState(false);

  var ws;

  const clearStorage = async ()=> {
    try {
      await AsyncStorage.clear()
    } catch(e){
      console.error(`clearStorage: ${e}`)
    }
  }
  
  //Try to get login info of the user.
  const get_login_info = async () => {
    try {
      const jsonValue= await AsyncStorage.getItem('@login_info');
      return JSON.parse(jsonValue);            
    } catch(e){
      console.error(`get_login_info: ${e}`);
    }
  }

  const store_login_info = async (info) => {
    try {
      const jsonValue = JSON.stringify(info);
      await AsyncStorage.setItem('@login_info', jsonValue);
    } catch(e){
      console.error(`store_login_info: ${e}`);
    }
  }

  function login_to_server(username, password){
    console.log(username, password);
    //Log in
    let login_msg = {
      type: 'Login',
      content: {
        username: username,
        password: password
      }
    }
    ws.send(JSON.stringify(login_msg));
    setIsLoggedIn(true);
  }

  var ws = new WebSocket('ws://10.0.0.2:8080');   //For PC dev
  // var ws = new WebSocket('ws://192.168.20.48:8080'); //For Laptop dev

  ws.onopen = () => {
    if (isLoggedIn) return;
    console.log('onopen');
    //Action to perform on connection open.

    if (DEBUG){
      if (CLEAR_STORAGE){
        clearStorage();
      }
      login_to_server('HaichiPapa', '12345678');
    } else {
      get_login_info().then(
        function(login_info){
          if (login_info===null){
            setShowLoginModal(true);
          }
        }
      );
    }



    // get_login_info().then(

    //   function(data){
    //     console.log(data);
    //     if (data===null){
    //       //No login info. Show modal
    //       setShowLoginModal(true);

    //     } else {
    //       setUsername(data.username);
    //       setPassword(data.password);
    //       login_to_server();
    //     }
    //   }
    // );   
  }

  ws.onmessage = (e) => {
    // a message was received  
    let msg = JSON.parse(e.data);

    switch(msg["type"]){
      case ("Chat"):
        add_chat_item("generic_message", msg["content"]);
        break;

      case ("Status"):
        setInfobarText(msg["content"]["health"]);
        break;
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
    //Generate a box with the text the user entered, as a visual feedback.
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
    //Display a text message recived from the server.
    //Parse it a CommonMark down.    
    return (
      <Box 
        style=                  {styles.chat_box_system} 
        borderRadius=           "10px" 
        borderBottomLeftRadius= "0px"
        borderColor=            "primary.600"
        borderWidth=            "3px"
      >
        <Markdown onLinkPress={link_handler}>{data}</Markdown>
      </Box>
    )
  }

  function add_chat_item(template, data){
    //get data and converts it to a chat item format, according to it's source.
    let content;
    if (template===null){
      return;

    } else if (template==="user_text"){      
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

  function link_handler(data){
    //Handles clicks on links in the Chat interface.
    //Each link has metadata of the form "NPC_ID".
    //The commands to be displayed in the ActionSheet depend on the type.
    
    let data_arr= data.split('_');
    let type=     data_arr[0];
    let id=       data_arr[1];

    let content = [];
    let cmd_arr = [];

    switch(type){
      case('NPC'):
        cmd_arr = ["Look", "Kill"];
        break;
      
      case('ROOM'):
        cmd_arr = ["Look"];
        break;
      
      case('north'):
        cmd_arr = ["North"];
        break;

      case('south'):
        cmd_arr = ["South"];
        break;

      case('east'):
        cmd_arr = ["East"];
        break;

      case('west'):
        cmd_arr = ["West"];
        break;

      case('up'):
        cmd_arr = ["Up"];
        break;

      case('down'):
        cmd_arr = ["Down"];
        break;

      case('User'):
        cmd_arr = ["Look"];
        break;

      case("Screwdriver"):
      case("Candy"):
      case("T-Shirt"):
        cmd_arr = ["Look", "Get", "Drop", "Wear/Hold", "Remove", "Consume"];
        break;
      
      default:
        console.error(`link_handler: unknown type - ${type}.`);
    }

    for (let cmd of cmd_arr){
      
      switch (cmd){
        case "Wear/Hold":
          cmd = 'Wear';
          break;

        case "Consume":
          cmd = 'Eat';
          break;        
      }

      let text;
      if (id===undefined){
        //Some commands don't have an ID (such as North, etc.)
        text = `${cmd}`;
      } else {
        text = `${cmd} ${id}`;
      }
      
      content.push(
        <Actionsheet.Item 
          key={get_new_id()}
          onPress={()=>{
            //When a command is pressed, process it as if the user typed
            //it manually, then close the ActionSheet.            
            process_user_input(text);            
            // setOpenCmdActnSht(false);            
          }}
          onPressOut={()=> {            
            setOpenCmdActnSht(false)
          }}

        >
          {text}
        </Actionsheet.Item>
      );      
    }
    
    //After populating the ActionSheet, open it.
    setCmdActnSht_Content(content);    
    setOpenCmdActnSht(true);        
  }

  function process_user_input(text){

    add_chat_item('user_text', {content: text});

    let msg = {
      type: 'User Input',
      content: text
    }    
    ws.send(JSON.stringify(msg));
  }  

  return (
    <NativeBaseProvider>

      <Box          style={styles.container} safeArea>
        <ChatArea   chatData={chatData} link_handler={link_handler}/>
        <InfoBar    text={infobarText}/>        
        <UserInput  process_user_input={process_user_input}/>
      </Box>

      <CommandsActionsheet openCmdActnSht={openCmdActnSht} content={cmdActnSht_Content}/>

      {/* Login Modal */}
      <Modal 
        isOpen={showLoginModal} 
        onClose={()=>{setShowLoginModal(false)}} 
        avoidKeyboard
      >
      <Modal.Content>
        <Modal.CloseButton />
        <Modal.Header>Enter Username And Password</Modal.Header>
        <Modal.Body>
          <FormControl isRequired>
            <Stack mx="4">
              <FormControl.Label>Username</FormControl.Label>
              <Input 
                selectTextOnFocus= {true}
                value={username}
                onChangeText={(value)=>{setUsername(value)}}
              />
              <FormControl.Label>Password</FormControl.Label>
              <Input 
                type="password" 
                selectTextOnFocus= {true}
                value={password}
                onChangeText={(value)=>{setPassword(value)}}
              />
            </Stack>
          </FormControl>
        </Modal.Body>
        <Modal.Footer>
          <Button onPress={()=>{
            // store_login_info({
            //   username: {username},
            //   password: {password}
            // })
            setShowLoginModal(false);
            login_to_server(username, password)
          }}
          >
            Save
          </Button>          
        </Modal.Footer>
      </Modal.Content>
    </Modal>
      
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
