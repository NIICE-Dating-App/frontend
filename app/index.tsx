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
			<View 
				style={{
					flex: 1,
				}}>
				<View style={{ position: 'relative' }}>
					<Image
						source={require('../assets/images/index_background.png')} 
						resizeMode={"cover"}
						style={{
							width: '100%',
							height: 560,
						}}
					/>
					<Image
						source={require('../assets/images/niice_logo.png')}
						resizeMode="contain"
						style={{
							position: 'absolute',
							top: '40%',
							left: '50%',
							transform: [{ translateX: -135 }, { translateY: -110 }],
							width: 280,
							height: 280,
						}}
					/>
				</View>
				<View 
					style={{
						flex: 1,
						backgroundColor: "#1A44CC",
						borderTopLeftRadius: 30,
						borderTopRightRadius: 30,
            paddingTop: 10,
            paddingBottom: 40,
            justifyContent: "flex-end",
					}}>
					<View 
						style={{
							flexDirection: "row",
							backgroundColor: "#BBDBF6",
							borderRadius: 30,
							paddingVertical: 13,
							paddingHorizontal: 53,
							marginTop: 5,
							marginBottom: 8,
							marginHorizontal: 24,
							shadowColor: "#00000040",
							shadowOpacity: 0.3,
							shadowOffset: {
							    width: 0,
							    height: 4
							},
							shadowRadius: 4,
							elevation: 4,
						}}>
						<Image
							source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/No9caNHlmi/j11b7nn1_expires_30_days.png"}} 
							resizeMode = {"stretch"}
							style={{
								width: 22,
								height: 22,
								marginRight: 7,
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
							backgroundColor: "#BBDBF640",
							borderRadius: 30,
							paddingVertical: 13,
							marginBottom: 8,
							marginHorizontal: 24,
							shadowColor: "#00000040",
							shadowOpacity: 0.3,
							shadowOffset: {
							    width: 0,
							    height: 4
							},
							shadowRadius: 4,
							elevation: 4,
						}}>
						<Image
							source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/No9caNHlmi/w9kw41m3_expires_30_days.png"}} 
							resizeMode = {"stretch"}
							style={{
								width: 22,
								height: 22,
								marginRight: 7,
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
							shadowColor: "#00000040",
							shadowOpacity: 0.3,
							shadowOffset: {
							    width: 0,
							    height: 4
							},
							shadowRadius: 4,
							elevation: 4,
						}} onPress={()=>alert('Pressed!')}>
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
                  marginBottom: 40,  // Changed from 5 to 40
                  marginHorizontal: 24,
                  shadowColor: "#00000040",
                  shadowOpacity: 0.3,
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
	)
}