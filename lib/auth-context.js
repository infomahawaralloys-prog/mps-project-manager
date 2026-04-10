'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(function() {
    supabase.auth.getSession().then(function({ data: { session } }) {
      setUser(session?.user || null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(function(_event, session) {
      setUser(session?.user || null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return function() { subscription.unsubscribe(); };
  }, []);

  function fetchProfile(userId) {
    supabase.from('profiles').select('*').eq('id', userId).single()
      .then(function({ data, error }) {
        if (data) setProfile(data);
        setLoading(false);
      });
  }

  async function signUp(email, password, name, role) {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: { data: { name: name, role: role } }
    });
    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  async function updateProfile(updates) {
    if (!user) return;
    const { data, error } = await supabase.from('profiles')
      .update(updates).eq('id', user.id).select().single();
    if (error) throw error;
    setProfile(data);
    return data;
  }

  var value = {
    user: user,
    profile: profile,
    loading: loading,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    updateProfile: updateProfile,
    isPM: profile?.role === 'pm',
    isFab: profile?.role === 'fab',
    isDispatch: profile?.role === 'dispatch',
    isSite: profile?.role === 'site',
    isViewer: profile?.role === 'viewer',
    canEdit: profile?.role !== 'viewer',
    role: profile?.role || 'viewer',
    userName: profile?.name || ''
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
