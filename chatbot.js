import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert,ActivityIndicator, TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Import icons from the library




// Home screen: Display list of chat sessions
const HomeScreen = ({ navigation }) => {
  const [sessions, setSessions] = useState([]);
  const [newChatName, setNewChatName] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [isSessionOpen, setIsSessionOpen] = useState(false); // Track if a session is open
  const [editingSessionId, setEditingSessionId] = useState(null); // Track which session is being edited

  const apiUrl = 'https://android-chatbot-bu9f.onrender.com'; // Update this based on platform (localhost for iOS, 10.0.2.2 for Android emulator)

  // Fetch existing sessions from Flask API
  const fetchSessions = async () => {
    try {
      const response = await fetch(`${apiUrl}/home`);
      const data = await response.json();
      setSessions(data.sessions); // Assuming the response includes an array of sessions
    } catch (error) {
      console.error("Error fetching sessions", error);
    }
  };

  // Create a new chat session
  const createNewChat = async () => {
    if (newChatName.trim() === '') return;

    try {
      const response = await fetch(`${apiUrl}/new_chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatname: newChatName }),
      });
      const data = await response.json();

      if (data.success) {
        fetchSessions(); // Refresh session list after creating new chat
        setNewChatName('');
      } else {
        console.error("Error creating new chat", data.error);
      }
    } catch (error) {
      console.error("Error creating new chat", error);
    }
  };

  // Delete a session with confirmation
  const deleteSession = async (sessionId) => {
    // Ask for confirmation before deletion
    try {
      // Send a delete request to your Flask API
      const response = await fetch(`${apiUrl}/delete_chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await response.json();

      if (data.success) {
        // Refresh session list after deleting the session
        fetchSessions();
      } else {
        console.error("Error deleting session", data.error);
      }
    } catch (error) {
      console.error("Error deleting session", error);
    }
  };
  

  // Rename a session
  const renameSession = async (sessionId) => {
    if (newSessionName.trim() === '') return;

    try {
      const response = await fetch(`${apiUrl}/rename_chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId, new_name: newSessionName }),
      });
      const data = await response.json();
      if (data.success) {
        fetchSessions(); // Refresh session list after renaming
        setNewSessionName(''); // Reset the rename input field
        setEditingSessionId(null); // Reset the editing session state
      } else {
        console.error("Error renaming session", data.error);
      }
    } catch (error) {
      console.error("Error renaming session", error);
    }
  };

  // Component did mount: Fetch sessions when the app starts
  useEffect(() => {
    fetchSessions();
  }, []);

  const openChat = (sessionId, sessionName) => {
    setIsSessionOpen(true); // Mark that a session is open
    navigation.navigate('Chat', { sessionId, sessionName });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat Sessions</Text>

      {/* Display existing sessions */}
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.sessionItem}>
            <View style={styles.sessionNameContainer}>
              {/* Session Name */}
              {editingSessionId === item.id ? (
                // Show input for renaming when in editing mode
                <TextInput
                  style={styles.input}
                  value={newSessionName}
                  onChangeText={setNewSessionName}
                  placeholder="Enter new name"
                />
              ) : (
                <Text style={styles.sessionName}>{item.name}</Text>
              )}

              {/* Show the rename and delete icons only if a session is open */}
              <View style={styles.iconContainer}>
                <TouchableOpacity
                  onPress={() => {
                    setEditingSessionId(item.id); // Set session as editable
                    setNewSessionName(item.name); // Pre-fill the input with the current name
                  }}
                >
                  <Icon name="edit" size={24} color="blue" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
  Alert.alert(
    'Confirm Deletion',
    'Are you sure you want to delete this session?',
    [
      {
        text: 'Cancel',
        onPress: () => console.log('Cancel Pressed'),
        style: 'cancel',
      },
      {
        text: 'OK',
        onPress: () => deleteSession(item.id),
      },
    ]
  );
}}>
  <Icon name="delete" size={24} color="red" />
</TouchableOpacity>

              </View>
            </View>

            {/* Open the chat and pass the sessionId and sessionName */}
            <Button
              title="Open Chat"
              onPress={() => openChat(item.id, item.name)}
            />
            {editingSessionId === item.id && (
              <Button title="Save" onPress={() => renameSession(item.id)} />
            )}
          </View>
        )}
      />

      {/* Create new chat */}
      <TextInput
        style={styles.input}
        placeholder="Enter chat name"
        value={newChatName}
        onChangeText={setNewChatName}
      />
      <Button title="Create New Chat" onPress={createNewChat} />
    </View>
  );
};

// Chat screen: Display chat history for selected session
const ChatScreen = ({ route }) => {
  const { sessionId, sessionName } = route.params;
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const apiUrl = 'https://android-chatbot-bu9f.onrender.com'; // Update this based on platform

  // Fetch chat history for the selected session
  const fetchChatHistory = async () => {
    try {
      const response = await fetch(`${apiUrl}/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await response.json();
      const res = [];
      data.results.forEach((element) => {
        res.push({ user: element.userText, model: element.modelText, chatId: element.chatId, sessionId: element.sessionid });
      });
      setChatHistory(res); // Assuming response includes chat history
    } catch (error) {
      console.error("Error fetching chat history", error);
    }
  };

  // Send a message to the selected session
  const sendMessage = async () => {
    if (message.trim() === '') return;
    const tempMessage = { user: message, model: 'loading...' };
    setChatHistory((prevHistory) => [...prevHistory, tempMessage]);
    setMessage('')
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/send_message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: tempMessage.user,
        }),
      });
      
      const data = await response.json();
      setChatHistory((prevHistory) =>
        prevHistory.map((item, index) =>
          index === prevHistory.length - 1
            ? { ...item, model: data.modelText }
            : item
        )
      );
    } catch (error) {
      console.error("Error sending message", error);
    } finally {
      setIsLoading(false);
      fetchChatHistory(); // Refresh chat history
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, [sessionId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{sessionName}</Text>
      <FlatList
        data={chatHistory}
        keyExtractor={(item, index) => index}
        renderItem={({ item }) => (
          <View style={styles.messageContainer}>
            <View style={styles.userMessageContainer}>
              <Text style={styles.userMessage}>User:</Text>
              <Text style={styles.userMessageNormal}>{item.user}</Text>
            </View>

            <View style={styles.modelMessageContainer}>
              <Text style={styles.modelMessageBold}>Model:</Text>
              {item.model === 'loading...' ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.modelMessageNormal}>Loading... </Text>
                  <ActivityIndicator size="small" color="#0000ff" />
                </View>
              ) : (
                <Text style={styles.modelMessageNormal}>{item.model}</Text>
              )}
            </View>
          </View>
        )}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter your message"
        value={message}
        onChangeText={setMessage}
      />
      <Button title={isLoading ? 'Sending...' : 'Send'} onPress={sendMessage} disabled={isLoading} />
    </View>
  );
};

const Stack = createStackNavigator();

export default function App() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({

    container: {
      flex: 1,
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    sessionItem: {
      marginBottom: 15,
    },
    sessionNameContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sessionName: {
      fontSize: 18,
    },
    iconContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: {
      height: 40, // Adjusted for better input experience
      borderColor: 'gray',
      borderWidth: 1,
      borderRadius: 25,
      marginBottom: 10,
      paddingLeft: 10,
    },
    messageContainer: {
      marginBottom: 10,
    },
    userMessageContainer: {
      backgroundColor: '#e0f7fa', // Light blue for user
      padding: 10,
      borderRadius: 5,
      marginBottom: 5,
    },
    modelMessageContainer: {
      backgroundColor: '#f1f8e9', // Light green for model
      padding: 10,
      borderRadius: 5,
      marginBottom: 5,
    },
    userMessage: {
      fontWeight: 'bold',
      fontSize: 16,
    },
    modelMessage: {
      fontWeight: 'normal',
      fontSize: 16,
    },
    userMessageNormal: {
      fontWeight: 'normal',
      fontSize: 16,
    },
    modelMessageBold: {
      fontWeight: 'bold',
      fontSize: 16,
    },
  });
  

