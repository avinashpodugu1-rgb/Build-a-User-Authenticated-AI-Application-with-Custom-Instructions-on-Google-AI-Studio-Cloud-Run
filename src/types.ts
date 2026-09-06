export type JournalMode = 'deep_reflection' | 'brainstorm' | 'summary' | 'inquiry';

export interface ConversationTurn {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface InteractionDocument {
  id: string;
  userId: string;
  title: string;
  mode: JournalMode;
  prompt: string;
  response: string;
  summary: string;
  tags: string[];
  turns: ConversationTurn[];
  createdAt: string;
  updatedAt: string;
}

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

export interface UserProfileData {
  userId: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastLoginAt: string;
  providerId?: string;
  emailVerified?: boolean;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified?: boolean;
  isAnonymous?: boolean;
  providerId?: string;
  isDemo?: boolean;
}
