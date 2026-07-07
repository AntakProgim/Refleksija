import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  googleSignIn, 
  logout, 
  initAuth, 
  listChatSpaces, 
  sendChatMessage, 
  ChatSpace 
} from '../services/googleChatService';
import { ReflectionData } from '../types';

interface GoogleChatShareProps {
  reflection: ReflectionData;
  aiInsights: any;
  dateStr: string;
}

const GoogleChatShare: React.FC<GoogleChatShareProps> = ({ reflection, aiInsights, dateStr }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>('');
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(false);
  const [messageType, setMessageType] = useState<'FULL' | 'PLAN'>('FULL');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Initialize auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        fetchSpaces(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setSpaces([]);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch spaces when we have a token
  const fetchSpaces = async (accessToken: string) => {
    setIsLoadingSpaces(true);
    setStatusMessage(null);
    try {
      const chatSpaces = await listChatSpaces(accessToken);
      setSpaces(chatSpaces);
      if (chatSpaces.length > 0) {
        setSelectedSpace(chatSpaces[0].name);
      }
    } catch (err: any) {
      console.error('Klauda kraunant kambarius:', err);
      // If unauthorized, token might have expired, so sign out
      if (err.message?.includes('401') || err.message?.includes('unauthorized')) {
        logout();
      } else {
        setStatusMessage({ 
          type: 'error', 
          text: `Nepavyko užkrauti Google Chat kambarių: ${err.message || err}` 
        });
      }
    } finally {
      setIsLoadingSpaces(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        await fetchSpaces(result.accessToken);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setStatusMessage({ 
        type: 'error', 
        text: `Nepavyko prisijungti prie Google Chat: ${err.message || err}` 
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setSpaces([]);
      setSelectedSpace('');
      setStatusMessage(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Generate message text based on selection
  useEffect(() => {
    let msg = '';
    const cleanStr = (s: string) => s?.trim() || 'Nepildyta';

    if (messageType === 'FULL') {
      msg = `🏫 *PEDAGOGINĖS REFLEKSIJOS ATASKAITA* (${dateStr})\n\n`;
      
      if (aiInsights) {
        msg += `✨ *MOKINIŲ APKLAUSOS DI ĮŽVALGOS*\n`;
        msg += `🟢 *Stiprybės:* ${cleanStr(aiInsights.strengths)}\n`;
        msg += `🟡 *Tobulėtinos sritys:* ${cleanStr(aiInsights.improvements)}\n`;
        if (aiInsights.sentimentScore) {
          msg += `📊 *Bendras emocinis fonas:* ${aiInsights.sentimentScore}/100\n`;
        }
        msg += `\n`;
      }

      msg += `📝 *MOKYTOJO SAVIREFLEKSIJA*\n`;
      msg += `🔍 *Pastebėjimai:* ${cleanStr(reflection.observations)}\n\n`;
      
      msg += `🚀 *VEIKSMŲ PLANAS*\n`;
      msg += `🛑 *Nustosiu:* ${cleanStr(reflection.actionStop)}\n`;
      msg += `🌱 *Pradėsiu:* ${cleanStr(reflection.actionStart)}\n`;
      msg += `🔁 *Tęsiu:* ${cleanStr(reflection.actionContinue)}\n`;
    } else {
      msg = `🚀 *MANO PEDAGOGINIO AUGIMO PLANAS* (${dateStr})\n\n`;
      msg += `🎯 *Konkretūs veiksmai mokinių emociniam fonui gerinti:*\n\n`;
      msg += `🛑 *NUSTOSIU:* ${cleanStr(reflection.actionStop)}\n\n`;
      msg += `🌱 *PRADĖSIU:* ${cleanStr(reflection.actionStart)}\n\n`;
      msg += `🔁 *TĘSIU:* ${cleanStr(reflection.actionContinue)}\n\n`;
      msg += `📅 *Kiti žingsniai:* ${cleanStr(reflection.nextSteps)}`;
    }

    setMessageText(msg);
  }, [messageType, reflection, aiInsights, dateStr]);

  const handleSendMessage = async () => {
    if (!token || !selectedSpace || !messageText.trim()) return;

    setIsSending(true);
    setStatusMessage(null);
    setShowConfirm(false);

    try {
      await sendChatMessage(token, selectedSpace, messageText);
      setStatusMessage({ 
        type: 'success', 
        text: 'Pranešimas sėkmingai išsiųstas į Google Chat!' 
      });
    } catch (err: any) {
      console.error('Send message error:', err);
      setStatusMessage({ 
        type: 'error', 
        text: `Nepavyko išsiųsti pranešimo: ${err.message || err}` 
      });
    } finally {
      setIsSending(false);
    }
  };

  const selectedSpaceName = spaces.find(s => s.name === selectedSpace)?.displayName || 'Pasirinktą kambarį';

  return (
    <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-gray-100 shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00897b] rounded-xl flex items-center justify-center text-white shadow-md">
            <i className="fas fa-comments text-lg"></i>
          </div>
          <div>
            <h4 className="font-black text-gray-900 tracking-tight">Bendrinti Google Chat</h4>
            <p className="text-gray-500 text-xs">Išsiųskite įžvalgas ar savo veiksmų planą į mokyklos metodinę grupę ar asmeninį kambarį.</p>
          </div>
        </div>
        {user && (
          <button 
            onClick={handleLogout} 
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-rose-600 transition-colors"
          >
            Atsijungti
          </button>
        )}
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-3 animate-scale-in ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
            : 'bg-rose-50 text-rose-800 border border-rose-100'
        }`}>
          <i className={`fas ${statusMessage.type === 'success' ? 'fa-circle-check text-emerald-500' : 'fa-circle-exclamation text-rose-500'} text-lg`}></i>
          <span>{statusMessage.text}</span>
        </div>
      )}

      {!user ? (
        <div className="text-center py-8 space-y-6">
          <p className="text-gray-500 text-sm max-w-md mx-auto font-medium">
            Prisijunkite su savo mokyklos „Google“ paskyra, kad galėtumėte tiesiogiai bendrinti ataskaitos rezultatus su kolegomis „Google Chat“ platformoje.
          </p>
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="gsi-material-button mx-auto shadow-xl hover:shadow-2xl transition-all"
            id="google-chat-login-btn"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents font-black text-gray-700 tracking-tight text-sm">
                {isLoggingIn ? 'Prisijungiama...' : 'Prisijungti su Google'}
              </span>
            </div>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* User Profile */}
          <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-10 h-10 rounded-full border border-gray-100 referrerPolicy='no-referrer'" />
            ) : (
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <p className="font-bold text-gray-800 text-sm">{user.displayName || 'Mokytojas'}</p>
              <p className="text-gray-400 text-xs">{user.email}</p>
            </div>
          </div>

          {/* Space selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pasirinkite Google Chat kambarį</label>
            {isLoadingSpaces ? (
              <div className="p-4 bg-white rounded-2xl border border-gray-100 text-center text-sm text-gray-500 font-bold animate-pulse-soft">
                Kraunami kambariai...
              </div>
            ) : spaces.length === 0 ? (
              <div className="p-4 bg-white rounded-2xl border border-gray-100 text-center text-sm text-gray-500 font-bold">
                Nerasta jokių Google Chat kambarių. Įsitikinkite, kad esate prisijungęs prie kambarių savo paskyroje.
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedSpace}
                  onChange={(e) => setSelectedSpace(e.target.value)}
                  className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none focus:border-[#00897b] transition-all font-bold text-sm text-gray-800 appearance-none cursor-pointer pr-10"
                  id="google-chat-space-select"
                >
                  {spaces.map(space => (
                    <option key={space.name} value={space.name}>
                      💬 {space.displayName} ({space.type === 'DIRECT_MESSAGE' ? 'Asmeninė žinutė' : 'Kambarys'})
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <i className="fas fa-chevron-down"></i>
                </div>
              </div>
            )}
          </div>

          {/* Message Type toggle */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pranešimo tipas</label>
            <div className="grid grid-cols-2 gap-3 bg-white p-1 rounded-2xl border border-gray-100">
              <button
                type="button"
                onClick={() => setMessageType('FULL')}
                className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  messageType === 'FULL' 
                    ? 'bg-[#00897b] text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Išsami ataskaita
              </button>
              <button
                type="button"
                onClick={() => setMessageType('PLAN')}
                className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  messageType === 'PLAN' 
                    ? 'bg-[#00897b] text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Tik veiksmų planas
              </button>
            </div>
          </div>

          {/* Message Preview */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pranešimo peržiūra ir redagavimas</label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full h-48 p-4 bg-white border border-gray-100 rounded-2xl text-xs font-mono text-gray-700 outline-none focus:border-[#00897b] transition-all resize-none custom-scrollbar"
              placeholder="Pranešimo tekstas..."
            />
          </div>

          {/* Confirmation before sending (MANDATORY per guidelines) */}
          {showConfirm ? (
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 space-y-4 animate-scale-in">
              <div className="flex items-start gap-3">
                <i className="fas fa-triangle-exclamation text-amber-500 text-lg mt-0.5"></i>
                <div>
                  <p className="font-bold text-amber-900 text-sm">Patvirtinkite išsiuntimą</p>
                  <p className="text-amber-700 text-xs font-medium">Ar tikrai norite išsiųsti šį pranešimą į „{selectedSpaceName}“? Tai atliks tiesioginį įrašą jūsų mokyklos kanale.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Atšaukti
                </button>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={isSending}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-100"
                >
                  {isSending ? 'Siunčiama...' : 'Taip, siųsti'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={!selectedSpace || !messageText.trim()}
              className="w-full py-4 rounded-2xl bg-[#00897b] hover:bg-[#00796b] disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-teal-100 transition-all active:scale-95 flex items-center justify-center gap-2"
              id="send-to-chat-btn"
            >
              <i className="fas fa-paper-plane text-xs"></i>
              Išsiųsti į Google Chat
            </button>
          )}
        </div>
      )}

      {/* Styling for Google Sign-In Button */}
      <style>{`
        .gsi-material-button {
          -moz-user-select: none;
          -webkit-user-select: none;
          -ms-user-select: none;
          -webkit-appearance: none;
          background-color: WHITE;
          background-image: none;
          border: 1px solid #747775;
          -webkit-border-radius: 12px;
          border-radius: 12px;
          -webkit-box-sizing: border-box;
          box-sizing: border-box;
          color: #1f1f1f;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          height: 48px;
          letter-spacing: 0.25px;
          outline: none;
          padding: 0 12px;
          position: relative;
          text-align: center;
          transition: background-color .218s, border-color .218s, box-shadow .218s;
          transition-property: background-color, border-color, box-shadow;
          vertical-align: middle;
          white-space: nowrap;
          width: auto;
          max-width: 400px;
          min-width: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gsi-material-button .gsi-material-button-icon {
          height: 20px;
          margin-right: 12px;
          min-width: 20px;
          width: 20px;
        }

        .gsi-material-button .gsi-material-button-content-wrapper {
          align-items: center;
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          height: 100%;
          justify-content: space-between;
          position: relative;
          width: 100%;
        }

        .gsi-material-button .gsi-material-button-contents {
          flex-grow: 1;
          text-align: left;
        }

        .gsi-material-button .gsi-material-button-state {
          -webkit-border-radius: 12px;
          border-radius: 12px;
          bottom: 0;
          left: 0;
          opacity: 0;
          position: absolute;
          right: 0;
          top: 0;
          transition: opacity .218s;
        }

        .gsi-material-button:hover {
          background-color: #f2f2f2;
        }

        .gsi-material-button:hover .gsi-material-button-state {
          opacity: 0.04;
        }

        .gsi-material-button:focus {
          border-color: #0b57d0;
          outline: none;
        }

        .gsi-material-button:focus .gsi-material-button-state {
          opacity: 0.12;
        }

        .gsi-material-button:active .gsi-material-button-state {
          opacity: 0.2;
        }

        .gsi-material-button:disabled {
          cursor: default;
          background-color: #ffffff61;
          border-color: #1f1f1f1f;
        }

        .gsi-material-button:disabled .gsi-material-button-contents {
          color: #1f1f1f1f;
        }

        .gsi-material-button:disabled .gsi-material-button-icon path {
          fill: #1f1f1f1f;
        }
      `}</style>
    </div>
  );
};

export default GoogleChatShare;
