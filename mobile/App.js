import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
} from 'react-native';

const API_URL = 'http://localhost:3000/api/tasks';

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [taskType, setTaskType] = useState('personal');
  const [taskPeriod, setTaskPeriod] = useState('daily');
  const [currentPeriod, setCurrentPeriod] = useState('daily');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const addTask = async () => {
    if (newTask.trim() === '') return;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          text: newTask,
          type: taskType,
          period: taskPeriod,
        }),
      });
      const data = await response.json();
      setTasks([...tasks, data]);
      setNewTask('');
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const toggleComplete = async (id, completed) => {
    try {
      await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({completed: !completed}),
      });
      const newTasks = tasks.map(task =>
        task.id === id ? {...task, completed: !completed} : task,
      );
      setTasks(newTasks);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async id => {
    try {
      await fetch(`${API_URL}/${id}`, {method: 'DELETE'});
      const newTasks = tasks.filter(task => task.id !== id);
      setTasks(newTasks);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const renderTask = ({item}) => (
    <View style={styles.task}>
      <TouchableOpacity onPress={() => toggleComplete(item.id, item.completed)}>
        <Text style={[styles.taskText, item.completed && styles.completed]}>
          {item.text}
        </Text>
      </TouchableOpacity>
      <Button title="Delete" onPress={() => deleteTask(item.id)} color="red" />
    </View>
  );

  const filteredTasks = tasks.filter(task => task.period === currentPeriod);
  const personalTasks = filteredTasks.filter(task => task.type === 'personal');
  const officialTasks = filteredTasks.filter(task => task.type === 'official');

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>To-Do List</Text>
      <View style={styles.viewSwitcher}>
        <Button
          title="Daily"
          onPress={() => setCurrentPeriod('daily')}
          disabled={currentPeriod === 'daily'}
        />
        <Button
          title="Weekly"
          onPress={() => setCurrentPeriod('weekly')}
          disabled={currentPeriod === 'weekly'}
        />
      </View>
      <View style={styles.inputSection}>
        <TextInput
          style={styles.input}
          placeholder="Add a new task..."
          value={newTask}
          onChangeText={setNewTask}
        />
        <View style={styles.pickerContainer}>
          <Button
            title="Personal"
            onPress={() => setTaskType('personal')}
            disabled={taskType === 'personal'}
          />
          <Button
            title="Official"
            onPress={() => setTaskType('official')}
            disabled={taskType === 'official'}
          />
        </View>
        <View style={styles.pickerContainer}>
          <Button
            title="Daily"
            onPress={() => setTaskPeriod('daily')}
            disabled={taskPeriod === 'daily'}
          />
          <Button
            title="Weekly"
            onPress={() => setTaskPeriod('weekly')}
            disabled={taskPeriod === 'weekly'}
          />
        </View>
        <Button title="Add Task" onPress={addTask} />
      </View>
      <View style={styles.taskLists}>
        <Text style={styles.listTitle}>
          Personal ({currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)})
        </Text>
        <FlatList
          data={personalTasks}
          renderItem={renderTask}
          keyExtractor={item => item.id.toString()}
        />
        <Text style={styles.listTitle}>
          Official ({currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)})
        </Text>
        <FlatList
          data={officialTasks}
          renderItem={renderTask}
          keyExtractor={item => item.id.toString()}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  viewSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  taskLists: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  task: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  taskText: {
    fontSize: 16,
  },
  completed: {
    textDecorationLine: 'line-through',
    color: 'gray',
  },
});

export default App;
