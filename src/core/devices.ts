/** Kinds of host devices that a service can be given access to */
export const DEVICE_KINDS = ["usb-printer"] as const;

export type DeviceKind = typeof DEVICE_KINDS[number];

/** Where the `/dev` of the host is mounted in a container, so it doesn't replace the container's own `/dev` */
export const HOST_DEV_PATH = "/host/dev";

/** One rule per minor number, a rule can't have a range */
function getCharacterDeviceRules(major: number, minors: number[]) {
  return minors.map(minor => `c ${major}:${minor} rwm`);
}

// Device cgroup rules allow opening only these device nodes, all the others stay denied
const DEVICE_CGROUP_RULES: Record<DeviceKind, string[]> = {
  // usblp has the minors 0-15 of the USB major (/dev/usb/lp0-15), the others are e.g. HID devices (hiddev)
  "usb-printer": getCharacterDeviceRules(180, Array.from({ length: 16 }, (_, minor) => minor)),
};

/**
 * The bind mount and the cgroup rules that give a container access to the devices of the given kinds.
 * The `/dev` of the host always exists, so the container starts whether a device is plugged in or not,
 * and `rslave` lets the device nodes that are created later show up in it.
 */
export function getDeviceHostConfig(kinds: DeviceKind[]) {
  if (kinds.length === 0) return { binds: [], cgroupRules: [] };
  return {
    binds: [`/dev:${HOST_DEV_PATH}:rslave`],
    cgroupRules: [...new Set(kinds)].flatMap(kind => DEVICE_CGROUP_RULES[kind]),
  };
}
