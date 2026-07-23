export const supabase = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
    getSession: () => Promise.resolve({ data: { session: { user: { id: 'test-user' } } }, error: null }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: {}, error: null }),
        order: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: () => Promise.resolve({ data: {}, error: null }),
      }),
      order: () => Promise.resolve({ data: [], error: null }),
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    upsert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
  }),
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'http://mock-url.com' } }),
    }),
  },
};
