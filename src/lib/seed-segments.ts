import type { ClosureSegment, LatLng } from "./types";

/**
 * Closed stretches for the seeded roadblocks. Paths were traced along the
 * OpenStreetMap road network (OSRM) so they follow real streets.
 */
export const SEED_SEGMENTS: Record<string, { pin: LatLng; segments: ClosureSegment[] }> = {
  "rb-01": {
    pin: { lat: 5.39422, lng: 100.32207 },
    segments: [
      { id: "rb-01-s1", kind: "partial", road: "Lebuhraya Tun Dr Lim Chong Eu", lengthM: 299, path: [{ lat: 5.39211, lng: 100.32039 }, { lat: 5.39234, lng: 100.32056 }, { lat: 5.39247, lng: 100.32066 }, { lat: 5.39397, lng: 100.32187 }, { lat: 5.39422, lng: 100.32207 }] },
    ],
  },
  "rb-02": {
    pin: { lat: 5.34394, lng: 100.30129 },
    segments: [
      { id: "rb-02-s1", kind: "partial", road: "Jalan Sultan Azlan Shah", lengthM: 372, path: [{ lat: 5.34526, lng: 100.30235 }, { lat: 5.34445, lng: 100.30187 }, { lat: 5.34429, lng: 100.30178 }, { lat: 5.34407, lng: 100.30165 }, { lat: 5.34336, lng: 100.30123 }, { lat: 5.34314, lng: 100.30111 }, { lat: 5.34283, lng: 100.30094 }, { lat: 5.34269, lng: 100.30085 }, { lat: 5.34236, lng: 100.30066 }] },
      { id: "rb-02-s2", kind: "partial", road: "Jalan Pantai Jerjak", modes: ["car"], lengthM: 189, path: [{ lat: 5.34527, lng: 100.30313 }, { lat: 5.34528, lng: 100.30312 }, { lat: 5.34544, lng: 100.30285 }, { lat: 5.34557, lng: 100.30265 }, { lat: 5.34527, lng: 100.30247 }, { lat: 5.34458, lng: 100.30206 }] },
    ],
  },
  "rb-03": {
    pin: { lat: 5.29725, lng: 100.26877 },
    segments: [
      { id: "rb-03-s1", kind: "partial", road: "Jalan Bayan Lepas", lengthM: 278, path: [{ lat: 5.29788, lng: 100.26986 }, { lat: 5.29779, lng: 100.26974 }, { lat: 5.29777, lng: 100.26972 }, { lat: 5.2976, lng: 100.26948 }, { lat: 5.29738, lng: 100.26914 }, { lat: 5.29723, lng: 100.26893 }, { lat: 5.29701, lng: 100.26848 }, { lat: 5.29691, lng: 100.26824 }, { lat: 5.29685, lng: 100.26805 }, { lat: 5.2968, lng: 100.26784 }, { lat: 5.29676, lng: 100.26765 }] },
    ],
  },
  "rb-04": {
    pin: { lat: 5.33036, lng: 100.28551 },
    segments: [
      { id: "rb-04-s1", kind: "partial", road: "Persiaran Mahsuri", lengthM: 146, path: [{ lat: 5.33036, lng: 100.28551 }, { lat: 5.33026, lng: 100.28512 }, { lat: 5.33023, lng: 100.2849 }, { lat: 5.33015, lng: 100.28464 }, { lat: 5.33003, lng: 100.28423 }] },
    ],
  },
  "rb-05": {
    pin: { lat: 5.35247, lng: 100.30003 },
    segments: [
      { id: "rb-05-s1", kind: "full", road: "Jalan Sungai Dua", lengthM: 326, path: [{ lat: 5.35182, lng: 100.29872 }, { lat: 5.35187, lng: 100.29878 }, { lat: 5.35191, lng: 100.29884 }, { lat: 5.35205, lng: 100.29902 }, { lat: 5.35217, lng: 100.2992 }, { lat: 5.35218, lng: 100.29922 }, { lat: 5.35223, lng: 100.29931 }, { lat: 5.35229, lng: 100.29943 }, { lat: 5.35236, lng: 100.29958 }, { lat: 5.35241, lng: 100.29973 }, { lat: 5.35245, lng: 100.2999 }, { lat: 5.35246, lng: 100.30002 }, { lat: 5.35247, lng: 100.30003 }, { lat: 5.35247, lng: 100.30014 }, { lat: 5.3525, lng: 100.30048 }, { lat: 5.35251, lng: 100.30061 }, { lat: 5.35255, lng: 100.30087 }, { lat: 5.35259, lng: 100.30109 }, { lat: 5.35268, lng: 100.3014 }, { lat: 5.35271, lng: 100.30146 }] },
    ],
  },
  "rb-06": {
    pin: { lat: 5.41287, lng: 100.3311 },
    segments: [
      { id: "rb-06-s1", kind: "partial", road: "Jalan Magazine", lengthM: 260, path: [{ lat: 5.41234, lng: 100.33215 }, { lat: 5.41247, lng: 100.33188 }, { lat: 5.41253, lng: 100.33176 }, { lat: 5.41258, lng: 100.33169 }, { lat: 5.41265, lng: 100.33153 }, { lat: 5.41279, lng: 100.33127 }, { lat: 5.41282, lng: 100.3312 }, { lat: 5.41287, lng: 100.3311 }, { lat: 5.41307, lng: 100.3307 }, { lat: 5.4131, lng: 100.33064 }, { lat: 5.41313, lng: 100.33059 }, { lat: 5.41318, lng: 100.33048 }, { lat: 5.41331, lng: 100.33021 }, { lat: 5.41339, lng: 100.33005 }] },
      { id: "rb-06-s2", kind: "partial", road: "Lebuh Lintang", modes: ["car", "motorcycle", "pedestrian"], lengthM: 139, path: [{ lat: 5.41328, lng: 100.33074 }, { lat: 5.4135, lng: 100.33085 }, { lat: 5.41355, lng: 100.33088 }, { lat: 5.41359, lng: 100.3309 }, { lat: 5.41367, lng: 100.33095 }, { lat: 5.41374, lng: 100.33099 }, { lat: 5.41381, lng: 100.33106 }, { lat: 5.41384, lng: 100.33109 }, { lat: 5.41391, lng: 100.33117 }, { lat: 5.414, lng: 100.33127 }, { lat: 5.41403, lng: 100.3313 }, { lat: 5.41425, lng: 100.33152 }] },
    ],
  },
  "rb-07": {
    pin: { lat: 5.4062, lng: 100.33447 },
    segments: [
      { id: "rb-07-s1", kind: "full", road: "Gat Lebuh Macallum", lengthM: 298, path: [{ lat: 5.40541, lng: 100.33556 }, { lat: 5.40553, lng: 100.3354 }, { lat: 5.40562, lng: 100.33531 }, { lat: 5.40565, lng: 100.33527 }, { lat: 5.40569, lng: 100.33517 }, { lat: 5.4062, lng: 100.33447 }, { lat: 5.40649, lng: 100.33407 }, { lat: 5.40655, lng: 100.33396 }, { lat: 5.40664, lng: 100.33381 }, { lat: 5.40688, lng: 100.33348 }, { lat: 5.40697, lng: 100.33337 }] },
    ],
  },
  "rb-08": {
    pin: { lat: 5.32373, lng: 100.28709 },
    segments: [
      { id: "rb-08-s1", kind: "partial", road: "Jalan Mayang Pasir", lengthM: 259, path: [{ lat: 5.32484, lng: 100.28748 }, { lat: 5.3248, lng: 100.28746 }, { lat: 5.3247, lng: 100.28743 }, { lat: 5.32464, lng: 100.28741 }, { lat: 5.32435, lng: 100.28731 }, { lat: 5.32419, lng: 100.28725 }, { lat: 5.32373, lng: 100.28709 }, { lat: 5.32329, lng: 100.28691 }, { lat: 5.32304, lng: 100.28682 }, { lat: 5.32264, lng: 100.28666 }] },
    ],
  },
  "rb-09": {
    pin: { lat: 5.37228, lng: 100.31251 },
    segments: [
      { id: "rb-09-s1", kind: "partial", road: "Jalan Akuarium", lengthM: 155, path: [{ lat: 5.37228, lng: 100.31251 }, { lat: 5.37229, lng: 100.31252 }, { lat: 5.37236, lng: 100.3126 }, { lat: 5.37242, lng: 100.31265 }, { lat: 5.37249, lng: 100.3127 }, { lat: 5.37256, lng: 100.31275 }, { lat: 5.37259, lng: 100.31277 }, { lat: 5.37267, lng: 100.31283 }, { lat: 5.3728, lng: 100.31289 }, { lat: 5.37295, lng: 100.31294 }, { lat: 5.37327, lng: 100.31302 }, { lat: 5.37352, lng: 100.31309 }] },
      { id: "rb-09-s2", kind: "partial", road: "Lebuhraya Tun Dr Lim Chong Eu", modes: ["motorcycle"], lengthM: 139, path: [{ lat: 5.37168, lng: 100.31433 }, { lat: 5.37209, lng: 100.31443 }, { lat: 5.37228, lng: 100.3145 }, { lat: 5.37249, lng: 100.31457 }, { lat: 5.37287, lng: 100.31472 }] },
    ],
  },
  "rb-10": {
    pin: { lat: 5.31973, lng: 100.28567 },
    segments: [
      { id: "rb-10-s1", kind: "partial", road: "Jalan Tengah", lengthM: 150, path: [{ lat: 5.31909, lng: 100.28686 }, { lat: 5.31915, lng: 100.28675 }, { lat: 5.31918, lng: 100.2867 }, { lat: 5.31945, lng: 100.28621 }, { lat: 5.31973, lng: 100.28567 }] },
    ],
  },
};
