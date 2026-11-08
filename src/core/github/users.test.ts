import { afterEach, describe, expect, it, vi } from "vitest";
import * as client from "./client";
import { getUser } from "./users";

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
