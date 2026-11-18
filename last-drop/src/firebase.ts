import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { COSMETIC_CATALOG } from './game/constants';
import { generateRandomTagId } from './game/storage';
import { UserProfile } from './game/types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

const VALID_COSMETIC_IDS = new Set(COSMETIC_CATALOG.map((c) => c.id));

function sanitizeDisplayName(raw: string | null | undefined): string {
  const cleaned = (raw || 'Survivor').trim().replace(/[<>&"']/g, '').slice(0, 24);
  return cleaned || 'Survivor';
}

function sanitizeProfilePayload(profile: UserProfile) {
  const owned = Array.from(
    new Set(
      (profile.ownedCosmetics || ['skin_classic', 'pick_fists', 'bb_none', 'gl_classic', 'mus_off', 'mus_skydrop']).filter(
        (id) => typeof id === 'string' && id.length > 0 && id.length <= 40
      )
    )
  ).slice(0, 64);
  if (owned.length === 0) owned.push('skin_classic');

  const eq = profile.equipped || {
    skin: 'skin_classic',
    pickaxe: 'pick_fists',
    backbling: 'bb_none',
    glider: 'gl_classic',
    music: 'mus_skydrop',
  };

  const clampStr = (val: string | undefined, fallback: string) =>
    val && VALID_COSMETIC_IDS.has(val) ? val : fallback;

  const sk = (profile.sk || [])
    .filter((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 20)
    .slice(0, 20);

  return {
    coins: Math.max(0, Math.min(10000000, Math.floor(profile.coins || 0))),
    xp: Math.max(0, Math.min(100000000, Math.floor(profile.xp || 0))),
    hype: Math.max(0, Math.min(1000000, Math.floor(profile.hype || 0))),
    eq: typeof profile.eq === 'number' ? Math.max(-1, Math.min(20, Math.floor(profile.eq))) : -1,
    sk,
    ownedCosmetics: owned,
    equipped: {
      skin: clampStr(eq.skin, 'skin_classic'),
      pickaxe: clampStr(eq.pickaxe, 'pick_fists'),
      backbling: clampStr(eq.backbling, 'bb_none'),
      glider: clampStr(eq.glider, 'gl_classic'),
      music: clampStr(eq.music, 'mus_skydrop'),
    },
    s: {
      g: Math.max(0, Math.floor(profile.s?.g || 0)),
      w: Math.max(0, Math.floor(profile.s?.w || 0)),
      k: Math.max(0, Math.floor(profile.s?.k || 0)),
      d: Math.max(0, Math.floor(profile.s?.d || 0)),
      b: Math.max(0, Math.floor(profile.s?.b || 0)),
      dm: Math.max(0, Math.floor(profile.s?.dm || 0)),
    },
  };
}

export interface CloudUserResult {
  displayName: string;
  profile: UserProfile;
  mode: number;
}

export async function signInWithGooglePopup(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOutGoogle(): Promise<void> {
  await signOut(auth);
}

export function subscribeAuthState(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export async function loadOrCreateCloudAccount(
  user: User,
  seedProfile: UserProfile,
  seedMode: number
): Promise<CloudUserResult> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (snap.exists()) {
    const data = snap.data();
    const sanitized = sanitizeProfilePayload({
      ...seedProfile,
      ...(data as Partial<UserProfile>),
    });
    return {
      displayName: sanitizeDisplayName(data.displayName || user.displayName),
      profile: {
        ...sanitized,
        tagId:
          typeof data.tagId === 'string' && /^#[0-9]{4}$/.test(data.tagId)
            ? data.tagId
            : generateRandomTagId(),
      },
      mode: data.mode === 1 ? 1 : 0,
    };
  }

  // Reserve a unique randomized 4-digit #XXXX tagId atomically with user account creation
  let chosenTagId = generateRandomTagId();
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = generateRandomTagId();
    const code = candidate.slice(1);
    const tagRef = doc(db, 'accountTags', code);
    try {
      const existingTag = await getDoc(tagRef);
      if (!existingTag.exists()) {
        chosenTagId = candidate;
        break;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `accountTags/${code}`);
    }
  }

  const tagCode = chosenTagId.slice(1);
  const tagRef = doc(db, 'accountTags', tagCode);
  const displayName = sanitizeDisplayName(user.displayName?.split(' ')[0] || user.displayName);
  const cleanPayload = sanitizeProfilePayload(seedProfile);
  const cleanMode = seedMode === 1 ? 1 : 0;

  const batch = writeBatch(db);
  batch.set(tagRef, {
    uid: user.uid,
    tagId: chosenTagId,
    createdAt: serverTimestamp(),
  });
  batch.set(userRef, {
    uid: user.uid,
    displayName,
    tagId: chosenTagId,
    ...cleanPayload,
    mode: cleanMode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  return {
    displayName,
    profile: {
      ...cleanPayload,
      tagId: chosenTagId,
    },
    mode: cleanMode,
  };
}

export async function saveCloudAccount(
  uid: string,
  displayName: string,
  profile: UserProfile,
  mode: number
): Promise<void> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  const cleanPayload = sanitizeProfilePayload(profile);
  try {
    await updateDoc(userRef, {
      displayName: sanitizeDisplayName(displayName),
      ...cleanPayload,
      mode: mode === 1 ? 1 : 0,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}
