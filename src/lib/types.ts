export type Role = "guest" | "public" | "admin";

export type LatLng = { lat: number; lng: number };

export type Area = LatLng & {
  id: string;
  name: string;
};

export type Place = LatLng & {
  id: string;
  name: string;
  area: string;
};

export type ClosureType = "full" | "partial";
export type RoadblockStatus = "scheduled" | "active" | "completed";

/** Who a roadblock blocks. A roadblock can affect several kinds of traffic. */
export type TravelMode = "car" | "motorcycle" | "pedestrian";

/** One Mutiara LRT station. Codes follow the line's numbering (S31 … S02, A01). */
export type Station = LatLng & {
  code: string;
  name: string;
  /** Index into CONSTRUCTION_PHASES. */
  phaseIndex: number;
  /** Overall construction progress, 0–100. */
  progress: number;
  /** Target opening, e.g. "Q3 2030". */
  opening: string;
  note: string;
  /** Landmarks and transport links within walking distance. */
  nearby?: string[];
  /** Interim station used until the permanent one is built. */
  provisional?: boolean;
  /** Where the two routes meet. */
  interchange?: boolean;
  /** A train depot sits beside this station. */
  depot?: boolean;
};

/**
 * A stretch of road drawn by an admin. Paths are snapped to the road network,
 * so they follow streets instead of cutting across buildings.
 */
export type ClosureSegment = {
  id: string;
  kind: ClosureType;
  road: string;
  path: LatLng[];
  lengthM: number;
  /** Who this stretch blocks. Falls back to the roadblock's own setting when missing. */
  modes?: TravelMode[];
};

/** Daily closure window in 24h "HH:mm" format, e.g. 08:00 – 17:00. */
export type DailyWindow = { start: string; end: string };

export type Roadblock = LatLng & {
  id: string;
  road: string;
  areaId: string;
  closure: ClosureType;
  /**
   * Who the roadblock blocks (at least one). Each drawn stretch can set its own;
   * this applies when nothing is drawn and is the default for new stretches.
   */
  modes: TravelMode[];
  /** Size of the blocked zone around the pin in metres (used when no stretch is drawn). */
  radiusM: number;
  status: RoadblockStatus;
  startDate: string; // ISO
  endDate: string; // ISO
  dailyWindow?: DailyWindow;
  phaseIndex: number; // index into CONSTRUCTION_PHASES
  /** Closed stretches drawn on the map (one roadblock can span several roads). */
  segments?: ClosureSegment[];
  description: string;
  detour: string;
  image: string;
  lastUpdated: string; // ISO
};

export type ReportCategory =
  | "inaccurate-status"
  | "wrong-period"
  | "safety-hazard"
  | "congestion"
  | "other";

export type ReportEntry = {
  at: string; // ISO
  note: string;
  category: ReportCategory;
  observedAt: string; // ISO
  images: string[]; // file names (mock upload)
  /** Browser object URLs for photos uploaded this session (seed data has none). */
  imageUrls?: string[];
  /** Older entries: how far from the pin the reporter was when filing, and where. */
  distanceM?: number;
  positionLabel?: string;
};

/** Who handled a report and when: kept so every view / focus change is attributable. */
export type ReportLogEntry = {
  at: string; // ISO
  action: "viewed" | "unviewed" | "focused" | "unfocused";
  adminId: string;
  adminName: string;
};

export type Report = {
  id: string;
  roadblockId: string;
  userId: string;
  createdAt: string; // ISO
  viewed: boolean;
  /** Flagged by an admin for follow-up. */
  focused?: boolean;
  /** First entry is the original report; later entries are appended updates. */
  entries: ReportEntry[];
  log?: ReportLogEntry[];
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  date: string; // ISO (posting date)
  periodStart?: string;
  periodEnd?: string;
  pdfName?: string;
  /** URL the PDF can be viewed at (static file or a browser object URL). */
  pdfUrl?: string;
  priority: "info" | "important" | "urgent";
  author: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subscriptions: string[]; // area ids
  notifications: {
    /** Citizens: announcement emails. Admins: an email for each new citizen report. */
    email: boolean;
    /** Citizens: announcements on WhatsApp (needs a phone number). */
    whatsapp: boolean;
    /** Citizens: announcements by SMS (needs a phone number). */
    sms: boolean;
    smartLocation: boolean;
  };
};

export type PendingChange =
  | { id: string; kind: "add"; at: string; roadblock: Roadblock }
  | { id: string; kind: "edit"; at: string; roadblock: Roadblock; before: Roadblock }
  | { id: string; kind: "remove"; at: string; roadblock: Roadblock };

/** Announcement drafted in the Post tab, published together with roadblock changes. */
export type PendingAnnouncement = Omit<Announcement, "date" | "author">;

export type ActivityItem = {
  id: string;
  at: string; // ISO
  kind: "post" | "announcement" | "review" | "report";
  text: string;
};
