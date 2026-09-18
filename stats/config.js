/* config.js
   Where the shared counters live. These two values come from the Supabase project's
   settings and are meant to be public: the database's own rules decide what this key
   may do (call two functions, nothing else). Leave both blank to run with no shared
   counters at all; the game plays exactly the same.
*/
const GLOBAL_STATS = {
  url: 'https://gjixxutjmchzxozalnyj.supabase.co',
  key: 'sb_publishable_iIWvvlrhInMnd8AxoE7MMw_i9nyEexa'   // public by design
};
