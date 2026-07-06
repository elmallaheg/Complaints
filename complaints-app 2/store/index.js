// store/index.js — يختار التخزين تلقائيًا: Supabase إن وُجدت الإعدادات، وإلا JSON محلي
require("dotenv").config();

const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const store = useSupabase ? require("./supabaseStore") : require("./jsonStore");
store.backend = useSupabase ? "supabase" : "json";

module.exports = store;
