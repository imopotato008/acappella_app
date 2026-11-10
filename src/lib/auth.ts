import { User } from "@/types";

export interface AuthResult {
  success: boolean;
  message?: string;
  user?: User;
}

/**
 * ユーザー認証を行う純粋関数
 */
export function authenticateUser(
  users: User[],
  id: string,
  password: string
): AuthResult {
  const user = users.find((u) => u.id === id);
  if (!user) {
    return { success: false, message: "指定されたIDのアカウントが見つかりません。" };
  }
  if (user.password !== password) {
    return { success: false, message: "パスワードが正しくありません。" };
  }
  return { success: true, user };
}

export interface NewUserInput {
  id: string;
  password: string;
  nickname: string;
  bio?: string;
  isAdmin?: boolean;
}

/**
 * 管理者による新規ユーザー作成のバリデーションとユーザーオブジェクト生成
 */
export function validateAndCreateUser(
  currentUser: User | null,
  users: User[],
  newUser: NewUserInput
): { success: boolean; message?: string; createdUser?: User } {
  if (!currentUser?.isAdmin) {
    return { success: false, message: "アカウントを作成する管理者権限がありません。" };
  }

  const trimmedId = newUser.id.trim();
  if (!trimmedId) {
    return { success: false, message: "IDを入力してください。" };
  }
  if (users.some((u) => u.id === trimmedId)) {
    return { success: false, message: `ID「${trimmedId}」は既に使用されています。` };
  }
  if (!newUser.password) {
    return { success: false, message: "初期パスワードを入力してください。" };
  }
  if (!newUser.nickname.trim()) {
    return { success: false, message: "あだ名を入力してください。" };
  }

  const createdUser: User = {
    id: trimmedId,
    password: newUser.password,
    nickname: newUser.nickname.trim(),
    bio: newUser.bio?.trim() || "",
    isAdmin: !!newUser.isAdmin,
  };

  return { success: true, createdUser };
}

