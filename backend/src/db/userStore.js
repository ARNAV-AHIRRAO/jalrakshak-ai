const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const config = require('../config/env');

const isSupabaseConfigured =
  config.SUPABASE_URL &&
  config.SUPABASE_SERVICE_ROLE_KEY &&
  !config.SUPABASE_URL.includes('your_supabase') &&
  !config.SUPABASE_SERVICE_ROLE_KEY.includes('your_supabase');

let supabase = null;
if (isSupabaseConfigured) {
  supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// In-memory user fallback store when Supabase credentials are placeholder or offline
const memoryUsers = new Map();

/**
 * Remove sensitive password data before returning user objects.
 */
function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...sanitized } = user;
  return sanitized;
}

class UserStore {
  static async findByEmail(email) {
    const normalizedEmail = email.toLowerCase().trim();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .eq('email', normalizedEmail)
          .single();

        if (data && !error) {
          return data;
        }
      } catch (err) {
        console.warn('Supabase query failed, using in-memory store fallback:', err.message);
      }
    }

    // In-memory store fallback lookup
    for (const user of memoryUsers.values()) {
      if (user.email.toLowerCase() === normalizedEmail) {
        return { ...user };
      }
    }
    return null;
  }

  static async findById(id) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .eq('id', id)
          .single();

        if (data && !error) {
          const authUser = memoryUsers.get(id);
          return {
            ...data,
            email: authUser ? authUser.email : data.email,
          };
        }
      } catch (err) {
        console.warn('Supabase query failed, using in-memory store fallback:', err.message);
      }
    }

    const user = memoryUsers.get(id);
    return user ? { ...user } : null;
  }

  static async createUser({ email, password_hash, full_name, role }) {
    const normalizedEmail = email.toLowerCase().trim();
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newUser = {
      id: userId,
      email: normalizedEmail,
      password_hash,
      full_name,
      role: role || 'operator',
      created_at: now,
      updated_at: now,
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('app_users').insert({
          id: userId,
          email: normalizedEmail,
          password_hash,
          full_name,
          role: newUser.role,
          created_at: now,
          updated_at: now,
        }).select().single();
        if (error) throw error;
        if (data) memoryUsers.set(userId, data);
      } catch (err) {
        console.warn('Supabase insert failed, maintaining memory store:', err.message);
      }
    }

    memoryUsers.set(userId, newUser);
    return { ...newUser };
  }
}

module.exports = {
  UserStore,
  sanitizeUser,
};
