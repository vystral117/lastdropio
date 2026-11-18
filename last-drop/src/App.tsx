import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { DeathCamOverlay } from './components/DeathCamOverlay';
import { GameCanvas } from './components/GameCanvas';
import { GameHud } from './components/GameHud';
import { MatchModal } from './components/MatchModal';
import { TitleOverlay } from './components/TitleOverlay';
import {
  loadOrCreateCloudAccount,
  saveCloudAccount,
  signInWithGooglePopup,
  signOutGoogle,
  subscribeAuthState,
} from './firebase';
import { playSfx, stopLobbyMusic, syncLobbyMusic } from './game/audio';
import {
  DEFAULT_KEYBINDS,
  RARITY_COLORS,
  RARITY_NAMES,
  RARITY_WEIGHTS,
  SKINS,
} from './game/constants';
import { GameEngine } from './game/engine';
import {
  createEmptyProfile,
  getActiveProfile,
  hashPassword,
  loadDB,
  saveDB,
} from './game/storage';
import {
  CosmeticItem,
  DeathCamState,
  GameDB,
  GameScreen,
  HudSnapshot,
  Keybinds,
  LockerCategory,
  MatchResult,
  TitleTab,
  UserProfile,
} from './game/types';

export default function App() {
  const [db, setDb] = useState<GameDB>(() => loadDB());
  const [guestProfile, setGuestProfile] = useState<UserProfile>(() =>
    createEmptyProfile()
  );

  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [cloudProfile, setCloudProfile] = useState<UserProfile | null>(null);
  const [cloudDisplayName, setCloudDisplayName] = useState<string>('Survivor');
  const [authLoading, setAuthLoading] = useState(false);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);

  const dbRef = useRef(db);
  const guestRef = useRef(guestProfile);
  const googleUserRef = useRef(googleUser);
  const cloudProfileRef = useRef(cloudProfile);
  const cloudDisplayNameRef = useRef(cloudDisplayName);
  dbRef.current = db;
  guestRef.current = guestProfile;
  googleUserRef.current = googleUser;
  cloudProfileRef.current = cloudProfile;
  cloudDisplayNameRef.current = cloudDisplayName;

  const [screen, setScreen] = useState<GameScreen>('TITLE_MENU');
  const [titleTab, setTitleTab] = useState<TitleTab>('play');
  const [listeningKey, setListeningKey] = useState<keyof Keybinds | null>(null);
  const [crateReward, setCrateReward] = useState<string | null>(null);
  const [shopNotice, setShopNotice] = useState<string | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [deathCamState, setDeathCamState] = useState<DeathCamState | null>(null);
  const [hasDeathCam, setHasDeathCam] = useState(false);
  const [allOver, setAllOver] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);

  const screenRef = useRef(screen);
  screenRef.current = screen;

  const showFullMapRef = useRef(showFullMap);
  showFullMapRef.current = showFullMap;

  const listeningRef = useRef(listeningKey);
  listeningRef.current = listeningKey;

  const titleTabRef = useRef(titleTab);
  titleTabRef.current = titleTab;

  const getSettings = useCallback(() => dbRef.current.set, []);
  const getKeybinds = useCallback(() => dbRef.current.kb, []);
  const getProfile = useCallback(() => {
    if (googleUserRef.current && cloudProfileRef.current) {
      return cloudProfileRef.current;
    }
    return getActiveProfile(dbRef.current, guestRef.current);
  }, []);

  const saveProfileUpdate = useCallback((updater: (profile: UserProfile) => void) => {
    if (googleUserRef.current && cloudProfileRef.current) {
      const nextCloud = structuredClone(cloudProfileRef.current);
      updater(nextCloud);
      cloudProfileRef.current = nextCloud;
      setCloudProfile(nextCloud);
      void saveCloudAccount(
        googleUserRef.current.uid,
        cloudDisplayNameRef.current,
        nextCloud,
        dbRef.current.mode
      ).catch((err) => {
        setAuthErrorMsg(err instanceof Error ? err.message : 'Failed to sync cloud progress.');
      });
      return;
    }

    const currentDb = dbRef.current;
    if (currentDb.cur && currentDb.users[currentDb.cur]) {
      const nextDb: GameDB = {
        ...currentDb,
        users: {
          ...currentDb.users,
          [currentDb.cur]: {
            ...currentDb.users[currentDb.cur],
            u: structuredClone(currentDb.users[currentDb.cur].u),
          },
        },
      };
      updater(nextDb.users[currentDb.cur].u);
      saveDB(nextDb);
      setDb(nextDb);
    } else {
      const nextGuest = structuredClone(guestRef.current);
      updater(nextGuest);
      setGuestProfile(nextGuest);
    }
  }, []);

  const engine = useMemo(
    () =>
      new GameEngine({
        onMatchFinish: (result, clipReady) => {
          setMatchResult(result);
          setHasDeathCam(clipReady);
          setAllOver(result.title === 'VICTORY');
          setScreen(result.title === 'ELIMINATED' && clipReady ? 'DEATH_CAM' : 'RESULTS');
        },
        onAllEliminated: (winnerName) => {
          setAllOver(true);
          setMatchResult((prev) => (prev ? { ...prev, winnerName } : prev));
          setScreen((prev) => (prev === 'DEATH_CAM' ? 'DEATH_CAM' : 'RESULTS'));
        },
        onHudUpdate: (snapshot) => {
          setHud(snapshot);
        },
        onDeathCamUpdate: (dc) => {
          setDeathCamState(dc);
        },
        onDeathCamFinish: () => {
          setScreen((prev) => (prev === 'DEATH_CAM' ? 'RESULTS' : prev));
        },
        getSettings,
        getKeybinds,
        getProfile,
        saveProfileUpdate,
      }),
    [getSettings, getKeybinds, getProfile, saveProfileUpdate]
  );

  useEffect(() => {
    const unsub = subscribeAuthState(async (user) => {
      if (!user) {
        setGoogleUser(null);
        setCloudProfile(null);
        setAuthLoading(false);
        return;
      }
      setAuthLoading(true);
      setAuthErrorMsg(null);
      try {
        const seed = getActiveProfile(dbRef.current, guestRef.current);
        const loaded = await loadOrCreateCloudAccount(user, seed, dbRef.current.mode);
        setGoogleUser(user);
        setCloudProfile(loaded.profile);
        setCloudDisplayName(loaded.displayName);
        if (loaded.mode !== dbRef.current.mode) {
          const nextDb = { ...dbRef.current, mode: loaded.mode };
          saveDB(nextDb);
          setDb(nextDb);
        }
      } catch (err) {
        setAuthErrorMsg(
          err instanceof Error ? err.message : 'Unable to load cloud account.'
        );
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const startMatch = useCallback(() => {
    setMatchResult(null);
    setDeathCamState(null);
    setHasDeathCam(false);
    setAllOver(false);
    setShowFullMap(false);
    setScreen('PLAYING');
    const currentDb = dbRef.current;
    const name = googleUserRef.current
      ? cloudDisplayNameRef.current
      : currentDb.cur || 'You';
    if ((currentDb.mode | 0) === 2) {
      engine.startOnlineMatch(name);
    } else {
      engine.startMatch(name, (currentDb.mode | 0) === 1);
    }
  }, [engine]);

  const returnToLobby = useCallback(() => {
    engine.disconnectOnline();
    engine.initAmbientWorld();
    setMatchResult(null);
    setDeathCamState(null);
    setHasDeathCam(false);
    setAllOver(false);
    setShowFullMap(false);
    setHud(null);
    setScreen('TITLE_MENU');
    setTitleTab('play');
  }, [engine]);

  const toggleMute = useCallback(() => {
    const nextDb: GameDB = {
      ...dbRef.current,
      set: {
        ...dbRef.current.set,
        snd: dbRef.current.set.snd ? 0 : 1,
      },
    };
    saveDB(nextDb);
    setDb(nextDb);
  }, []);

  const handleUiClick = useCallback(() => {
    playSfx('ui', dbRef.current.set);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      if (listeningRef.current) {
        e.preventDefault();
        if (k !== 'escape') {
          const targetAction = listeningRef.current;
          const nextDb: GameDB = {
            ...dbRef.current,
            kb: { ...dbRef.current.kb, [targetAction]: k },
          };
          saveDB(nextDb);
          setDb(nextDb);
        }
        setListeningKey(null);
        return;
      }

      const activeScreen = screenRef.current;

      if (activeScreen === 'TITLE_MENU') {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (
          titleTabRef.current === 'play' &&
          (e.key === 'Enter' || e.key === ' ') &&
          tag !== 'INPUT' &&
          tag !== 'BUTTON'
        ) {
          e.preventDefault();
          handleUiClick();
          startMatch();
        }
        return;
      }

      if (activeScreen === 'DEATH_CAM') {
        if (e.key === 'Escape' || e.key === ' ') {
          e.preventDefault();
          engine.skipDeathCam();
        }
        return;
      }

      if (activeScreen !== 'PLAYING') return;

      if (e.key === 'Escape') {
        if (showFullMapRef.current) {
          setShowFullMap(false);
          return;
        }
        if (engine.me && !engine.me.alive) {
          engine.clearInputs();
          setScreen('RESULTS');
        }
        return;
      }

      if (e.key === ' ' && engine.me?.inPlane) {
        e.preventDefault();
        engine.jumpFromPlane();
        return;
      }

      engine.keys[k] = true;

      if (!engine.me || !engine.me.alive) return;
      const kb = dbRef.current.kb;
      if (k === kb.map) {
        setShowFullMap((prev) => !prev);
        return;
      }
      if (k === kb.emote) {
        engine.triggerEmote();
        return;
      }

      if (engine.me.inPlane || engine.me.dropTime > 0) return;
      for (let i = 1; i <= 6; i++) {
        if (k === kb[`s${i}` as keyof Keybinds]) {
          engine.selectSlot(i - 1);
        }
      }
      if (k === kb.pick) engine.pickUpNearest();
      if (k === kb.reload) engine.triggerReload();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      engine.keys[e.key.toLowerCase()] = false;
    };

    const onMouseUp = () => {
      engine.mouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (screenRef.current !== 'PLAYING') return;
      engine.cycleSlot(e.deltaY > 0 ? 1 : -1);
    };

    const onBlur = () => {
      engine.clearInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('blur', onBlur);
    };
  }, [engine, handleUiClick, startMatch]);

  const activeProfile =
    googleUser && cloudProfile
      ? cloudProfile
      : getActiveProfile(db, guestProfile);

  const playerName = googleUser
    ? cloudDisplayName
    : db.cur || 'Guest Survivor';

  useEffect(() => {
    syncLobbyMusic(
      screen === 'TITLE_MENU',
      activeProfile.equipped?.music || 'mus_skydrop',
      db.set
    );
    return () => {
      stopLobbyMusic();
    };
  }, [screen, activeProfile.equipped?.music, db.set]);

  const handleBuyCosmetic = (item: CosmeticItem) => {
    const owned = activeProfile.ownedCosmetics || [];
    if (owned.includes(item.id)) {
      handleEquipCosmetic(item.category, item.id);
      return;
    }
    if (activeProfile.coins < item.price) {
      setShopNotice(`Need ${item.price - activeProfile.coins} more coins to unlock ${item.name}.`);
      return;
    }
    saveProfileUpdate((u) => {
      u.coins -= item.price;
      u.ownedCosmetics = u.ownedCosmetics || [];
      if (!u.ownedCosmetics.includes(item.id)) {
        u.ownedCosmetics.push(item.id);
      }
      u.equipped[item.category] = item.id;
      if (item.category === 'glider') {
        u.eq = -1;
      }
    });
    setShopNotice(`Unlocked & equipped ${item.name}!`);
  };

  const handleEquipCosmetic = (category: LockerCategory, itemId: string) => {
    saveProfileUpdate((u) => {
      u.equipped[category] = itemId;
      if (category === 'glider') {
        u.eq = -1;
      }
    });
  };

  const handleOpenCrate = () => {
    if (activeProfile.coins < 150) {
      setCrateReward('Not enough coins. Win matches and get kills to earn more.');
      return;
    }

    let r = Math.random() * 100;
    let rarity = 0;
    while (rarity < 3 && r >= RARITY_WEIGHTS[rarity]) {
      r -= RARITY_WEIGHTS[rarity];
      rarity++;
    }

    const pool = SKINS.map((_, idx) => idx).filter(
      (idx) => SKINS[idx].r === rarity
    );
    const chosenIdx = pool[Math.floor(Math.random() * pool.length)];
    const skin = SKINS[chosenIdx];
    const isDup = (activeProfile.sk || []).includes(chosenIdx);

    saveProfileUpdate((u) => {
      u.coins -= 150;
      u.sk = u.sk || [];
      if (isDup) {
        u.coins += 40;
      } else {
        u.sk.push(chosenIdx);
        u.eq = chosenIdx;
      }
    });

    setCrateReward(
      `<span style="color:${RARITY_COLORS[rarity]}">${RARITY_NAMES[rarity]}: ${skin.n}</span>${
        isDup ? ' (duplicate, +40 coins)' : ' — Unlocked & Equipped!'
      }`
    );
  };

  const handleAuth = async (
    rawName: string,
    pass: string
  ): Promise<string | null> => {
    const cleanName = rawName.trim().replace(/[<>&"']/g, '').slice(0, 12);
    if (!cleanName || pass.length < 4) {
      return 'Enter a name and a password with at least 4 characters.';
    }
    let hashed: string;
    try {
      hashed = await hashPassword(pass);
    } catch {
      return 'Login is not available in this browser.';
    }

    const existing = db.users[cleanName];
    if (existing && existing.h !== hashed) {
      return 'Wrong password.';
    }

    const takenTags = new Set(
      Object.values(db.users)
        .map((entry) => entry.u.tagId)
        .filter(Boolean)
    );

    const nextDb: GameDB = {
      ...db,
      cur: cleanName,
      users: existing
        ? db.users
        : {
            ...db.users,
            [cleanName]: {
              h: hashed,
              u: createEmptyProfile(takenTags),
            },
          },
    };
    saveDB(nextDb);
    setDb(nextDb);
    return null;
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthErrorMsg(null);
    try {
      await signInWithGooglePopup();
    } catch (err) {
      setAuthErrorMsg(
        err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.'
      );
      setAuthLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setAuthErrorMsg(null);
    try {
      await signOutGoogle();
    } catch (err) {
      setAuthErrorMsg(err instanceof Error ? err.message : 'Failed to sign out.');
    }
  };

  const handleUpdateDisplayName = (rawName: string) => {
    const clean = rawName.trim().replace(/[<>&"']/g, '').slice(0, 16);
    if (!clean || !googleUser || !cloudProfile) return;
    setCloudDisplayName(clean);
    cloudDisplayNameRef.current = clean;
    void saveCloudAccount(googleUser.uid, clean, cloudProfile, db.mode).catch((err) => {
      setAuthErrorMsg(err instanceof Error ? err.message : 'Failed to update name.');
    });
  };

  const showCrosshair =
    screen === 'PLAYING' &&
    Boolean(hud?.playerAlive) &&
    !hud?.inPlane &&
    !hud?.parachuting &&
    !showFullMap;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#121518]">
      <GameCanvas
        engine={engine}
        getSettings={getSettings}
        activeCursor={showCrosshair}
      />

      {screen === 'TITLE_MENU' && (
        <TitleOverlay
          db={db}
          profile={activeProfile}
          playerName={playerName}
          tab={titleTab}
          listeningKey={listeningKey}
          crateReward={crateReward}
          shopNotice={shopNotice}
          googleUser={
            googleUser
              ? {
                  uid: googleUser.uid,
                  email: googleUser.email,
                  displayName: googleUser.displayName,
                }
              : null
          }
          authLoading={authLoading}
          authErrorMsg={authErrorMsg}
          onSetTab={setTitleTab}
          onSetMode={(m) => {
            const next = { ...db, mode: m };
            saveDB(next);
            setDb(next);
            if (googleUser && cloudProfile) {
              void saveCloudAccount(
                googleUser.uid,
                cloudDisplayName,
                cloudProfile,
                m
              ).catch(() => {});
            }
          }}
          onPlay={startMatch}
          onUiClick={handleUiClick}
          onOpenCrate={handleOpenCrate}
          onEquipSkin={(skinIdx) => saveProfileUpdate((u) => (u.eq = skinIdx))}
          onBuyCosmetic={handleBuyCosmetic}
          onEquipCosmetic={handleEquipCosmetic}
          onToggleSetting={(key) => {
            const next: GameDB = {
              ...db,
              set: { ...db.set, [key]: db.set[key] ? 0 : 1 },
            };
            saveDB(next);
            setDb(next);
          }}
          onVolumeChange={(vol) => {
            const next: GameDB = {
              ...db,
              set: { ...db.set, vol },
            };
            saveDB(next);
            setDb(next);
          }}
          onStartRebind={(action) => setListeningKey(action)}
          onResetKeybinds={() => {
            const next: GameDB = {
              ...db,
              kb: { ...DEFAULT_KEYBINDS },
            };
            saveDB(next);
            setDb(next);
          }}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignOut={handleGoogleSignOut}
          onUpdateDisplayName={handleUpdateDisplayName}
          onAuth={handleAuth}
          onSignOut={() => {
            const next: GameDB = { ...db, cur: null };
            saveDB(next);
            setDb(next);
          }}
        />
      )}

      {screen !== 'TITLE_MENU' && screen !== 'DEATH_CAM' && hud && (
        <GameHud
          hud={hud}
          keybinds={db.kb}
          muted={!db.set.snd}
          showFullMap={showFullMap}
          onToggleMap={() => setShowFullMap((prev) => !prev)}
          onToggleMute={() => {
            handleUiClick();
            toggleMute();
          }}
          onLeaveLobby={() => {
            handleUiClick();
            returnToLobby();
          }}
          onJumpPlane={() => engine.jumpFromPlane()}
          onSelectSlot={(idx) => engine.selectSlot(idx)}
          onSwapSlots={(a, b) => engine.swapSlots(a, b)}
          onDropSlot={(idx) => engine.dropSlot(idx)}
          onShowResults={() => {
            handleUiClick();
            setScreen('RESULTS');
          }}
        />
      )}

      {screen === 'DEATH_CAM' && deathCamState && (
        <DeathCamOverlay
          deathCam={deathCamState}
          onReplay={() => {
            handleUiClick();
            engine.startDeathCamPlayback();
          }}
          onSkip={() => {
            handleUiClick();
            engine.skipDeathCam();
          }}
        />
      )}

      {(screen === 'RESULTS' || screen === 'REPORT') && (
        <MatchModal
          mode={screen}
          result={matchResult}
          allOver={allOver}
          reportTarget={matchResult?.killer || hud?.spectatingName || 'Player'}
          hasDeathCam={hasDeathCam}
          onWatchDeathCam={() => {
            handleUiClick();
            engine.startDeathCamPlayback();
            setScreen('DEATH_CAM');
          }}
          onSpectate={() => {
            handleUiClick();
            setScreen('PLAYING');
          }}
          onPlayAgain={() => {
            handleUiClick();
            startMatch();
          }}
          onLobby={() => {
            handleUiClick();
            returnToLobby();
          }}
          onOpenReport={() => {
            handleUiClick();
            setScreen('REPORT');
          }}
          onCancelReport={() => {
            handleUiClick();
            setScreen('RESULTS');
          }}
          onSubmitReport={(reason) => {
            handleUiClick();
            const target = matchResult?.killer || hud?.spectatingName || 'Player';
            const next: GameDB = {
              ...db,
              rep: [
                ...(db.rep || []),
                { who: target, why: reason, at: Date.now() },
              ],
            };
            saveDB(next);
            setDb(next);
          }}
        />
      )}
    </div>
  );
}
