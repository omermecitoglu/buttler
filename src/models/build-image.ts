// NOTE (v2 roadmap): Build images in v2 are managed directly via Docker as runtime state.
// This legacy v1 model is deprecated and preserved for reference until Phase 3 build pipeline redesign.

export type BuildImageDTO = {
  id: string,
  serviceId: string,
  status: string,
  createdAt: string,
  updatedAt: string,
};

export type NewBuildImageDTO = {
  serviceId: string,
  status: string,
};

export type BuildImagePatchDTO = Partial<NewBuildImageDTO>;
