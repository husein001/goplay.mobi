import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'goplay.jwt';

/** JWT хранится в системном keychain/keystore, а не в AsyncStorage. */
export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function loadToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
