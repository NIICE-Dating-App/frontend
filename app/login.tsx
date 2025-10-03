import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { supabase } from '../supabase';

const { width, height } = Dimensions.get('window');

interface CircleWithPinProps {
  x: number;
  y: number;
  circleSize?: number;
  hasPin?: boolean;
}

const MapPin: React.FC<{ size?: number }> = ({ size = 80 }) => (
  <Svg 
    width={size}
    height={size * 1.4}
    viewBox="0 0 50 70"
    preserveAspectRatio="xMidYMid meet"
    style={styles.pinSvg}
  >
    {/* Location Pin Shape - Google Maps style */}
    <Path
      d="M25 5 C36 5 45 14 45 25 C45 32 40 42 25 62 C10 42 5 32 5 25 C5 14 14 5 25 5 Z"
      fill="#1E40D8"
    />
    {/* Inner circle dot */}
    <SvgCircle cx="25" cy="25" r="8" fill="#000000" />
  </Svg>
);

const CircleWithPin: React.FC<CircleWithPinProps> = ({ 
  x, 
  y, 
  circleSize = 71, 
  hasPin = false 
}) => (
  <View style={[styles.circleContainer, { left: x, top: y }]}>
    <View
      style={[
        styles.backgroundCircle,
        {
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
        },
      ]}
    />
    {hasPin && (
      <View style={styles.pinWrapper}>
        <MapPin size={70} />
      </View>
    )}
  </View>
);

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      // First, find the email associated with this username from your users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('username', username)
        .single();

      if (userError || !userData) {
        Alert.alert('Login Failed', 'Username not found');
        setLoading(false);
        return;
      }

      // Now login with the email
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: password,
      });

      if (error) {
        Alert.alert('Login Failed', error.message);
      } else {
        Alert.alert('Success', 'Logged in successfully!');
        // Navigate to your main app screen here
        // router.push('/home'); // Uncomment when you have a home screen
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        <CircleWithPin x={47} y={-3} circleSize={71} hasPin={true} />
        <CircleWithPin x={317} y={22} circleSize={71} hasPin={true} />
        <CircleWithPin x={277} y={138} circleSize={71} hasPin={true} />
        <CircleWithPin x={206} y={4} circleSize={71} hasPin={false} />
        <CircleWithPin x={47} y={-3} circleSize={71} hasPin={true} />
        <CircleWithPin x={59} y={134} circleSize={71} hasPin={true} />
        <CircleWithPin x={150} y={192} circleSize={71} hasPin={false} />
        <CircleWithPin x={152} y={93} circleSize={71} hasPin={false} />
        <CircleWithPin x={-12} y={465} circleSize={71} hasPin={true} />
        <CircleWithPin x={-25} y={625} circleSize={71} hasPin={false} />
        <CircleWithPin x={60} y={572} circleSize={71} hasPin={false} />
        <CircleWithPin x={165} y={645} circleSize={71} hasPin={true} />
        <CircleWithPin x={288} y={617} circleSize={71} hasPin={false} />
        <CircleWithPin x={-25} y={298} circleSize={71} hasPin={false} />
        <CircleWithPin x={60} y={720} circleSize={71} hasPin={true} />
        <CircleWithPin x={-20} y={830} circleSize={71} hasPin={false} />
        <CircleWithPin x={165} y={794} circleSize={71} hasPin={false} />
        <CircleWithPin x={261} y={725} circleSize={71} hasPin={true} />
        <CircleWithPin x={312} y={803} circleSize={71} hasPin={false} />
        <CircleWithPin x={357} y={701} circleSize={71} hasPin={false} />
        <CircleWithPin x={357} y={538} circleSize={71} hasPin={false} />
        <CircleWithPin x={344} y={319} circleSize={71} hasPin={true} />
        <CircleWithPin x={-36} y={170} circleSize={71} hasPin={false} />
        <CircleWithPin x={357} y={197} circleSize={71} hasPin={false} />
      </View>

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton}
        onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Login Card */}
      <View style={styles.loginCard}>
        {/* Username Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder=""
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder=""
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            secureTextEntry
            editable={!loading}
          />
        </View>

        {/* Log In Button */}
        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>Log In</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFCFD',
  },
  backgroundPattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  circleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundCircle: {
    backgroundColor: '#C8DBE8',
    opacity: 0.85,
  },
  pinWrapper: {
    position: 'absolute',
    top: -43,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinSvg: {
    alignSelf: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 58,
    left: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loginCard: {
    position: 'absolute',
    top: height * 0.26,
    left: 32,
    right: 32,
    backgroundColor: '#2347E8',
    borderRadius: 32,
    paddingTop: 32,
    paddingBottom: 36,
    paddingHorizontal: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 15,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  input: {
    height: 52,
    backgroundColor: 'rgba(104, 131, 242, 0.55)',
    borderRadius: 26,
    paddingHorizontal: 22,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loginButton: {
    height: 56,
    backgroundColor: '#0A0A0A',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});