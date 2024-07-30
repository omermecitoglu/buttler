import nodegit from "nodegit";

export function cloneRepo(repoUrl: string, targetPath: string) {
  return nodegit.Clone(repoUrl, targetPath, {
    fetchOpts: {
      callbacks: {
        certificateCheck: () => 0,
        credentials: (_url: string, userName: string) => {
          return nodegit.Credential.sshKeyFromAgent(userName);
        },
      },
    },
  });
}
