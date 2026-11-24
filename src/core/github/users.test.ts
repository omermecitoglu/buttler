import { afterEach, describe, expect, it, vi } from "vitest";
import * as client from "./client";
import { GitHubApiError, GitHubAuthError } from "./errors";
import { findUser, getUser } from "./users";

describe("getUser", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch authenticated user details with public email", async () => {
    vi.spyOn(client, "githubFetch").mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: {
        id: 42,
        login: "octocat",
        name: "Mona Lisa Octocat",
        avatar_url: "https://github.com/images/octocat.png",
        email: "octocat@github.com",
      },
    });

    const user = await getUser("fake-token");

    expect(user).toEqual({
      id: 42,
      login: "octocat",
      name: "Mona Lisa Octocat",
      avatar: "https://github.com/images/octocat.png",
      avatar_url: "https://github.com/images/octocat.png",
      email: "octocat@github.com",
    });
  });

  it("should fetch email from /user/emails if email is null on /user", async () => {
    const githubFetchSpy = vi.spyOn(client, "githubFetch");
    githubFetchSpy.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: {
        id: 42,
        login: "octocat",
        name: null,
        avatar_url: "https://github.com/images/octocat.png",
        email: null,
      },
    });
    githubFetchSpy.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: [
        { email: "secondary@example.com", primary: false, verified: true },
        { email: "primary@example.com", primary: true, verified: true },
      ],
    });

    const user = await getUser("fake-token");

    expect(user).toEqual({
      id: 42,
      login: "octocat",
      name: null,
      avatar: "https://github.com/images/octocat.png",
      avatar_url: "https://github.com/images/octocat.png",
      email: "primary@example.com",
    });
    expect(githubFetchSpy).toHaveBeenCalledTimes(2);
  });

  it("should gracefully return email null if /user/emails fails", async () => {
    const githubFetchSpy = vi.spyOn(client, "githubFetch");
    githubFetchSpy.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: {
        id: 42,
        login: "octocat",
        name: "Octocat",
        avatar_url: "https://github.com/images/octocat.png",
        email: null,
      },
    });
    githubFetchSpy.mockRejectedValueOnce(new Error("Scope not granted"));

    const user = await getUser("fake-token");

    expect(user.email).toBeNull();
  });
});

describe("findUser", () => {
  const account = { id: 42, login: "octocat", name: null, avatar_url: "https://avatars.githubusercontent.com/u/42", email: null };
  const respondWith = (type: string) => ({ status: 200, headers: new Headers(), data: { ...account, type } });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should find a person by their handle", async () => {
    const githubFetchSpy = vi.spyOn(client, "githubFetch").mockResolvedValueOnce(respondWith("User"));
    expect(await findUser("OctoCat", "token")).toEqual({ id: 42, login: "octocat", avatar: account.avatar_url });
    expect(githubFetchSpy).toHaveBeenCalledWith("/users/OctoCat", "token");
  });

  it("should return null for unknown handles", async () => {
    vi.spyOn(client, "githubFetch").mockRejectedValueOnce(new GitHubApiError("Not Found", 404));
    expect(await findUser("nobody")).toBeNull();
  });

  it.each(["", "../user", "a b", "x/repos", "app[bot]"])("should not ask GitHub for \"%s\"", async login => {
    const githubFetchSpy = vi.spyOn(client, "githubFetch");
    expect(await findUser(login)).toBeNull();
    expect(githubFetchSpy).not.toHaveBeenCalled();
  });

  it("should ignore organizations", async () => {
    vi.spyOn(client, "githubFetch").mockResolvedValueOnce(respondWith("Organization"));
    expect(await findUser("acme")).toBeNull();
  });

  it("should try again without an expired token", async () => {
    const githubFetchSpy = vi.spyOn(client, "githubFetch")
      .mockRejectedValueOnce(new GitHubAuthError())
      .mockResolvedValueOnce(respondWith("User"));
    expect(await findUser("octocat", "expired")).toMatchObject({ id: 42 });
    expect(githubFetchSpy).toHaveBeenLastCalledWith("/users/octocat", null);
  });

  it("should throw other errors", async () => {
    vi.spyOn(client, "githubFetch").mockRejectedValueOnce(new Error("network down"));
    await expect(findUser("octocat")).rejects.toThrow("network down");
  });
});
