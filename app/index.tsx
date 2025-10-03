import { router } from "expo-router";
import React from "react";
import { Image, Text, TouchableOpacity, View, } from "react-native";

type Props = Record<string, never>;
export default (props: Props) => {
	return (
		<View 
			style={{
				flex: 1,
				backgroundColor: "#FFFFFF",
			}}>
			<View>
				<View style={{ position: 'relative' }}>
					<Image
						source={require('../assets/images/index_background.png')} 
						resizeMode={"cover"}
						style={{
							width: '100%',
							height: 550,
						}}
					/>
					<Image
						source={require('../assets/images/niice_logo.png')}
						resizeMode="contain"
						style={{
							position: 'absolute',
							top: '40%',
							left: '49%',
							transform: [{ translateX: -135 }, { translateY: -110 }],
							width: 280,
							height: 280,
						}}
					/>
				</View>
				
				{/* Layered background approach */}
				<View style={{ position: "relative", marginTop: -100 }}>
					{/* Blue background layer - positioned absolutely */}
					<View
						style={{
							position: "absolute",
							top: 40, // adjust this value to move the curve up/down
							left: 0,
							right: 0,
							backgroundColor: "#1A44CC",
							borderTopLeftRadius: 30,
							borderTopRightRadius: 30,
							height: 1000, // large enough to fill rest of screen
						}}
					/>
					
					{/* Button content layer on top */}
					<View style={{ paddingTop: 65, paddingBottom: 90 }}>
						<View 
							style={{
								flexDirection: "row",
								alignItems: "center",
								backgroundColor: "#BBDBF6",
								borderRadius: 30,
								paddingVertical: 13,
								paddingHorizontal: 53,
								marginTop: 5,
								marginBottom: 8,
								marginHorizontal: 24,
								shadowColor: "#000000",
								shadowOpacity: 0.25,
								shadowOffset: {
									width: 0,
									height: 4
								},
								shadowRadius: 4,
								elevation: 4,
							}}>
							<Image
								source={require('../assets/images/apple_logo.png')} 
								resizeMode={"contain"}
								style={{
									width: 22,
									height: 22,
									marginRight: 7,
									marginTop: -2,
								}}
							/>
							<Text 
								style={{
									color: "#000910",
									fontSize: 18,
									fontFamily: "Kadwa-Bold",
								}}>
								{"Continue with Apple"}
							</Text>
						</View>
						
						<View 
							style={{
								flexDirection: "row",
								justifyContent: "center",
								alignItems: "center",
								backgroundColor: "#BBDBF640",
								borderRadius: 30,
								paddingVertical: 13,
								marginBottom: 8,
								marginHorizontal: 24,
								shadowColor: "#000000",
								shadowOpacity: 0.25,
								shadowOffset: {
									width: 0,
									height: 4
								},
								shadowRadius: 4,
								elevation: 4,
							}}>
							<Image
								source={require('../assets/images/google_logo.png')} 
								resizeMode={"contain"}
								style={{
									width: 22,
									height: 22,
									marginRight: 7,
									marginTop: -2,
								}}
							/>
							<Text 
								style={{
									color: "#EEF7FF",
									fontSize: 18,
									fontFamily: "Kadwa-Bold",
									marginRight: 9,
								}}>
								{"Continue with Google"}
							</Text>
							<View 
								style={{
									width: 22,
									height: 22,
								}}>
							</View>
						</View>
						
						<TouchableOpacity 
							style={{
								alignItems: "center",
								backgroundColor: "#BBDBF6",
								borderRadius: 30,
								paddingVertical: 13,
								marginBottom: 8,
								marginHorizontal: 24,
								shadowColor: "#000000",
								shadowOpacity: 0.25,
								shadowOffset: {
									width: 0,
									height: 4
								},
								shadowRadius: 4,
								elevation: 4,
							}} onPress={()=>router.push('/signup_phone')}>
							<Text 
								style={{
									color: "#000910",
									fontSize: 18,
									fontFamily: "Kadwa-Bold",
								}}>
								{"Sign Up"}
							</Text>
						</TouchableOpacity>
						
						<TouchableOpacity 
							style={{
								alignItems: "center",
								backgroundColor: "#000910",
								borderRadius: 30,
								paddingVertical: 13,
								marginBottom: 40,
								marginHorizontal: 24,
								shadowColor: "#000000",
								shadowOpacity: 0.25,
								shadowOffset: {
									width: 0,
									height: 4
								},
								shadowRadius: 4,
								elevation: 4,
							}} onPress={()=> router.push('/login')}>
							<Text 
								style={{
									color: "#EEF7FF",
									fontSize: 18,
									fontFamily: "Kadwa-Bold",
								}}>
								{"Log In"}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</View>
	)
}