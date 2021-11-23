let Parse;

if (process.env.NODE_ENV === 'production') {
  Parse = window.QiankunProps?.Parse;
} else {
  Parse = typeof window === 'undefined' ? require('parse/node') : require('parse');
  const BASE_URL = process.env.PROXIMA_BASE_URL;
  const PROXIMA_APP_ID = process.env.PROXIMA_APP_ID;
  Parse.serverURL = `${BASE_URL}/parse`;
  Parse.initialize(PROXIMA_APP_ID);
}

export default Parse;
