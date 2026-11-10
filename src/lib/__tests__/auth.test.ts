import { describe, expect, it } from "vitest";
import { authenticateUser, validateAndCreateUser, resetUserPasswordHelper, DEFAULT_INITIAL_PASSWORD } from "../auth";
import { User } from "@/types";

const mockUsers: User[] = [
  { id: "ken", password: "password123", nickname: "けんちゃん", isAdmin: true },
  { id: "misaki", password: "password123", nickname: "みーちゃん", isAdmin: false },
];

describe("認証・アカウント管理ロジック (authenticateUser / validateAndCreateUser)", () => {
  it("UT-AUTH-01: 正常ログイン", () => {
    const result = authenticateUser(mockUsers, "ken", "password123");
    expect(result.success).toBe(true);
    expect(result.user?.id).toBe("ken");
  });

  it("UT-AUTH-02: パスワード誤り", () => {
    const result = authenticateUser(mockUsers, "ken", "wrongpass");
    expect(result.success).toBe(false);
    expect(result.message).toContain("パスワードが正しくありません");
  });

  it("UT-AUTH-03: 存在しないID", () => {
    const result = authenticateUser(mockUsers, "nobody", "password123");
    expect(result.success).toBe(false);
    expect(result.message).toContain("見つかりません");
  });

  it("UT-AUTH-04: 管理者権限でのアカウント追加", () => {
    const adminUser = mockUsers[0]; // isAdmin: true
    const result = validateAndCreateUser(adminUser, mockUsers, {
      id: "takumi",
      password: "password123",
      nickname: "たくみ",
      bio: "ベース志望",
      isAdmin: false,
    });

    expect(result.success).toBe(true);
    expect(result.createdUser?.id).toBe("takumi");
    expect(result.createdUser?.nickname).toBe("たくみ");
  });

  it("UT-AUTH-05: 一般メンバーのアカウント追加拒否", () => {
    const generalUser = mockUsers[1]; // isAdmin: false
    const result = validateAndCreateUser(generalUser, mockUsers, {
      id: "takumi",
      password: "password123",
      nickname: "たくみ",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("管理者権限がありません");
  });

  it("UT-AUTH-06: ID重複の防止", () => {
    const adminUser = mockUsers[0];
    const result = validateAndCreateUser(adminUser, mockUsers, {
      id: "ken", // 既存ID
      password: "password999",
      nickname: "偽けんちゃん",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("既に使用されています");
  });

  describe("管理者によるパスワードリセット (resetUserPasswordHelper)", () => {
    it("UT-AUTH-07: 管理者が対象ユーザーのパスワードを初期値（password123）にリセットできる", () => {
      const adminUser = mockUsers[0];
      const result = resetUserPasswordHelper(adminUser, mockUsers, "misaki");
      expect(result.success).toBe(true);
      const updatedMisaki = result.updatedUsers?.find((u) => u.id === "misaki");
      expect(updatedMisaki?.password).toBe(DEFAULT_INITIAL_PASSWORD);
    });

    it("UT-AUTH-08: 一般メンバーは他人のパスワードをリセットできない", () => {
      const generalUser = mockUsers[1];
      const result = resetUserPasswordHelper(generalUser, mockUsers, "ken");
      expect(result.success).toBe(false);
      expect(result.message).toContain("管理者権限がありません");
    });

    it("UT-AUTH-09: 存在しないユーザーのリセットを試みた場合はエラーとなる", () => {
      const adminUser = mockUsers[0];
      const result = resetUserPasswordHelper(adminUser, mockUsers, "unknown_user");
      expect(result.success).toBe(false);
      expect(result.message).toContain("対象のアカウントが見つかりません");
    });

    it("UT-AUTH-10: 指定した新パスワードにリセットできる", () => {
      const adminUser = mockUsers[0];
      const result = resetUserPasswordHelper(adminUser, mockUsers, "misaki", "tempPass456");
      expect(result.success).toBe(true);
      const updatedMisaki = result.updatedUsers?.find((u) => u.id === "misaki");
      expect(updatedMisaki?.password).toBe("tempPass456");
    });
  });
});

