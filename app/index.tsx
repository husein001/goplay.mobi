import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';

/**
 * Корневой маршрут `/`. Сам ничего не рисует — сразу отправляет на нужный экран:
 * залогиненного на QR-сканер (главная), гостя на экран входа. Гейт в _layout
 * (Stack.Protected) дополнительно не пускает в приватную зону без входа.
 */
export default function Index() {
  const { user } = useAuth();
  return <Redirect href={user ? '/scan' : '/login'} />;
}
