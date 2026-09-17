/* Got Rot — field fixture data.
 *
 * Rot repair and crawl space remediation, Snohomish County WA. Two founders,
 * three field staff, 24 live jobs across every stage of the board.
 *
 * Everything here is frozen against clock.ts. No Date.now(), no new Date()
 * without an argument, no Math.random() — the same bytes on every run so a
 * screenshot today and one next month are identical.
 *
 * Reading order: people → customers → properties → jobs → findings → photos →
 * estimates → change orders → appointments → invoices → payments → threads →
 * messages → activity.
 *
 * Cross-reference rule: every ID referenced below exists. scripts/check-seed.mjs
 * proves it. */

import { NOW, NOW_ISO, at, onDay } from "./clock";
import type {
  Activity, Appointment, ChangeOrder, Customer, DB, Estimate, Finding, Invoice,
  Job, Payment, Person, Photo, Property, Message, Thread,
  TimeEntry, MaterialOrder, Callback, LeadResponse,
  Reel,
} from "./types";

/* =====================================================================
 * PEOPLE — five of them. Marcus and Dre are the founders; me = Marcus.
 * ===================================================================== */

const people: Person[] = [
  {
    id: "p1",
    name: "Marcus Reeve",
    role: "owner",
    phone: "(425) 268-4417",
    avatarTone: 1,
  },
  {
    id: "p2",
    name: "Dre Whitfield",
    role: "estimator",
    phone: "(425) 268-4418",
    avatarTone: 2,
  },
  {
    id: "p3",
    name: "Tino Alvarez",
    role: "lead_carpenter",
    phone: "(425) 931-7702",
    avatarTone: 3,
  },
  {
    id: "p4",
    name: "Jesse Park",
    role: "carpenter",
    phone: "(360) 419-5586",
    avatarTone: 4,
    initialsOnly: true,
  },
  {
    id: "p5",
    name: "Bea Ortiz",
    role: "coordinator",
    phone: "(425) 268-4400",
    avatarTone: 5,
  },
];

/* =====================================================================
 * CUSTOMERS — 16. c3 and c11 each own two properties.
 * ===================================================================== */

const customers: Customer[] = [
  {
    id: "c1",
    name: "Dana Whitcomb",
    phone: "(425) 774-3318",
    email: "dana.whitcomb@gmail.com",
    since: onDay(-118, 9, 0),
    preferredContact: "text",
    notes: "Works from home, prefers texts before 4pm. Golden retriever, keep the side gate latched.",
    propertyIds: ["pr1"],
  },
  {
    id: "c2",
    name: "Priya Raghunathan",
    phone: "(425) 316-9042",
    email: "p.raghunathan@outlook.com",
    since: onDay(-2, 14, 20),
    preferredContact: "email",
    notes: "Came in through the website form Tuesday afternoon.",
    propertyIds: ["pr2"],
  },
  {
    id: "c3",
    name: "Hollis Brandt",
    phone: "(425) 353-1187",
    email: "hbrandt.rentals@gmail.com",
    since: onDay(-402, 11, 0),
    preferredContact: "call",
    notes: "Owns two rentals off Rucker. Tenants in both — coordinate access through Hollis, never the tenant.",
    propertyIds: ["pr3", "pr4"],
  },
  {
    id: "c4",
    name: "Tomas Veliz",
    phone: "(425) 582-7731",
    email: "tveliz.home@gmail.com",
    since: onDay(-21, 10, 30),
    preferredContact: "call",
    notes: "Saw the yard sign on Larch Way. Retired, home most days.",
    propertyIds: ["pr5"],
  },
  {
    id: "c5",
    name: "Grace Nakamura",
    phone: "(425) 610-2294",
    email: "grace.nakamura@proton.me",
    since: onDay(-9, 16, 45),
    preferredContact: "text",
    notes: "Referred by the Sundstroms. Asks good questions, wants the scope written out.",
    propertyIds: ["pr6"],
  },
  {
    id: "c6",
    name: "Ron and Deb Kessler",
    phone: "(360) 653-4471",
    email: "rdkessler@comcast.net",
    since: onDay(-1, 18, 10),
    preferredContact: "call",
    notes: "Ron calls, Deb decides. Evening calls are fine.",
    propertyIds: ["pr7"],
  },
  {
    id: "c7",
    name: "Aimee Duclos",
    phone: "(206) 542-8830",
    email: "aimee.duclos@gmail.com",
    since: onDay(-56, 13, 0),
    preferredContact: "text",
    notes: "Deck job running now. Also wants the crawl space priced once the deck is closed out.",
    propertyIds: ["pr8"],
  },
  {
    id: "c8",
    name: "Bryce Halvorsen",
    phone: "(425) 377-6619",
    email: "bhalvorsen@gmail.com",
    since: onDay(-190, 9, 30),
    preferredContact: "text",
    notes: "Repeat. We did his siding in the spring. Pays fast, reads every line.",
    propertyIds: ["pr9"],
  },
  {
    id: "c9",
    name: "Nadia Petrosyan",
    phone: "(425) 408-1155",
    email: "nadia.petrosyan@gmail.com",
    since: onDay(-14, 8, 20),
    preferredContact: "email",
    notes: "Wants two options priced — repair the deck or rebuild it.",
    propertyIds: ["pr10"],
  },
  {
    id: "c10",
    name: "Wes Trimble",
    phone: "(425) 293-7708",
    email: "wtrimble@frontier.com",
    since: onDay(-31, 12, 0),
    preferredContact: "call",
    notes: "Insurance claim, PEMCO. Adjuster is Renae Coburn. Duplex — tenant in the back unit.",
    propertyIds: ["pr11"],
  },
  {
    id: "c11",
    name: "Karen Sundstrom",
    phone: "(425) 361-0074",
    email: "karen.sundstrom@gmail.com",
    since: onDay(-640, 10, 0),
    preferredContact: "text",
    notes: "Longest customer we have. Owns the Edmonds house and the Mukilteo rental. Refers us constantly.",
    propertyIds: ["pr12", "pr13"],
  },
  {
    id: "c12",
    name: "Jamal Whitaker",
    phone: "(425) 799-3362",
    email: "jwhitaker206@gmail.com",
    since: onDay(-44, 15, 0),
    preferredContact: "call",
    notes: "Referred by Bryce Halvorsen. Travels for work, calls back after 6pm.",
    propertyIds: ["pr14"],
  },
  {
    id: "c13",
    name: "Lauren Mikkelsen",
    phone: "(425) 501-8829",
    email: "lauren.mikkelsen@gmail.com",
    since: onDay(-5, 11, 15),
    preferredContact: "text",
    notes: "Referred by Grace Nakamura. Baby in the house — no loud demo before 9am.",
    propertyIds: ["pr15"],
  },
  {
    id: "c14",
    name: "Ted Arakawa",
    phone: "(425) 224-6640",
    email: "ted.arakawa@gmail.com",
    since: onDay(-38, 9, 0),
    preferredContact: "email",
    notes: "Getting three bids on the envelope. Wants everything in writing, no verbal changes.",
    propertyIds: ["pr16"],
  },
  {
    id: "c15",
    name: "Colleen Byrne",
    phone: "(360) 659-2218",
    email: "colleen.byrne@gmail.com",
    since: onDay(-210, 14, 0),
    preferredContact: "text",
    notes: "Repeat. We reframed her porch last year. Two dogs, keep the gate shut.",
    propertyIds: ["pr17"],
  },
  {
    id: "c16",
    name: "Vincent Alderete",
    phone: "(425) 870-4491",
    email: "v.alderete@gmail.com",
    since: onDay(-287, 10, 45),
    preferredContact: "call",
    notes: "Took a cheaper bid on the deck last year. Came back for the sill plate anyway.",
    propertyIds: ["pr18"],
  },
];

/* =====================================================================
 * PROPERTIES — 18. Real streets in the towns we actually work.
 * ===================================================================== */

const properties: Property[] = [
  {
    id: "pr1",
    customerId: "c1",
    address: "8624 Bowdoin Way",
    city: "Edmonds",
    zip: "98026",
    yearBuilt: 1967,
    accessNotes: "Crawl hatch is inside the garage, behind the chest freezer. Side gate code 4417.",
    structures: ["crawl space", "rear deck", "garage"],
    photo: "gr-11",
    lat: 47.8059, lng: -122.3574,
  },
  {
    id: "pr2",
    customerId: "c2",
    address: "15427 Dumas Rd",
    city: "Mill Creek",
    zip: "98012",
    yearBuilt: 1994,
    accessNotes: "Driveway is steep — park on the street.",
    structures: ["attached garage", "siding"],
    photo: "gr-05",
    lat: 47.8637, lng: -122.2011,
  },
  {
    id: "pr3",
    customerId: "c3",
    address: "2711 Rucker Ave",
    city: "Everett",
    zip: "98201",
    yearBuilt: 1928,
    accessNotes: "Tenant occupied. Exterior crawl hatch on the north side, padlock code 1928. Text Hollis before arriving.",
    structures: ["crawl space", "post and pier foundation", "front porch"],
    photo: "gr-12",
    lat: 47.9802, lng: -122.1957,
  },
  {
    id: "pr4",
    customerId: "c3",
    address: "2719 Rucker Ave",
    city: "Everett",
    zip: "98201",
    yearBuilt: 1931,
    accessNotes: "Same block as 2711. Deck access through the back gate, unlocked.",
    structures: ["rear deck", "crawl space"],
    photo: "gr-17",
    lat: 47.9778, lng: -122.1925,
  },
  {
    id: "pr5",
    customerId: "c4",
    address: "4218 Larch Way",
    city: "Lynnwood",
    zip: "98036",
    yearBuilt: 1972,
    accessNotes: "Tomas is home. Park in the driveway, he moves the truck.",
    structures: ["front porch", "covered entry", "siding"],
    photo: "gr-15",
    lat: 47.8173, lng: -122.2923,
  },
  {
    id: "pr6",
    customerId: "c5",
    address: "1140 Loveland Ave",
    city: "Mukilteo",
    zip: "98275",
    yearBuilt: 1961,
    accessNotes: "Crawl hatch on the south side under the kitchen bump-out. Low clearance, 22in.",
    structures: ["crawl space", "kitchen bump-out"],
    photo: "gr-19",
    lat: 47.9158, lng: -122.2904,
  },
  {
    id: "pr7",
    customerId: "c6",
    address: "6819 Grove St",
    city: "Marysville",
    zip: "98270",
    yearBuilt: 1979,
    accessNotes: "Crawl access through the laundry room floor hatch.",
    structures: ["crawl space", "laundry room"],
    photo: "gr-09",
    lat: 48.0542, lng: -122.1723,
  },
  {
    id: "pr8",
    customerId: "c7",
    address: "17832 Fremont Ave N",
    city: "Shoreline",
    zip: "98133",
    yearBuilt: 1958,
    accessNotes: "Deck is off the back. Neighbor shares the driveway — do not block it.",
    structures: ["rear deck", "crawl space", "siding"],
    photo: "gr-26",
    lat: 47.7557, lng: -122.3235,
  },
  {
    id: "pr9",
    customerId: "c8",
    address: "9312 N Davies Rd",
    city: "Lake Stevens",
    zip: "98258",
    yearBuilt: 1984,
    accessNotes: "Gravel drive, fine for the trailer. Crawl hatch on the east wall, no lock.",
    structures: ["crawl space", "rear deck", "stair landing"],
    photo: "gr-06",
    lat: 48.0127, lng: -122.0526,
  },
  {
    id: "pr10",
    customerId: "c9",
    address: "19406 Waynita Way NE",
    city: "Bothell",
    zip: "98011",
    yearBuilt: 1989,
    accessNotes: "Deck is 9ft above grade at the far corner. Bring the 12ft ladder.",
    structures: ["rear deck", "ledger", "posts"],
    photo: "gr-13",
    lat: 47.7553, lng: -122.2054,
  },
  {
    id: "pr11",
    customerId: "c10",
    address: "3524 Hoyt Ave",
    city: "Everett",
    zip: "98201",
    yearBuilt: 1946,
    accessNotes: "Duplex. Front unit vacant, key in the lockbox 0416. Back unit tenant has not given access.",
    structures: ["crawl space", "kitchen subfloor", "interior wall base"],
    photo: "gr-07",
    lat: 47.9826, lng: -122.1989,
  },
  {
    id: "pr12",
    customerId: "c11",
    address: "731 Daley St",
    city: "Edmonds",
    zip: "98020",
    yearBuilt: 1954,
    accessNotes: "Crawl hatch in the hall closet floor. Karen leaves the closet cleared for us.",
    structures: ["crawl space", "main bath", "subfloor"],
    photo: "gr-02",
    lat: 47.8119, lng: -122.351,
  },
  {
    id: "pr13",
    customerId: "c11",
    address: "508 5th St",
    city: "Mukilteo",
    zip: "98275",
    yearBuilt: 1963,
    accessNotes: "Rental, between tenants. Key in the lockbox on the hose bib, 5081.",
    structures: ["upstairs bath", "subfloor", "crawl space"],
    photo: "gr-12",
    lat: 47.9098, lng: -122.2824,
  },
  {
    id: "pr14",
    customerId: "c12",
    address: "5127 Spruce Way",
    city: "Lynnwood",
    zip: "98037",
    yearBuilt: 1969,
    accessNotes: "Crawl hatch outside, west wall behind the rhododendron. Jamal travels — use the lockbox 5127.",
    structures: ["crawl space", "rear deck", "laundry"],
    photo: "gr-11",
    lat: 47.8173, lng: -122.2923,
  },
  {
    id: "pr15",
    customerId: "c13",
    address: "824 Chennault Beach Rd",
    city: "Mukilteo",
    zip: "98275",
    yearBuilt: 1976,
    accessNotes: "Baby naps 12 to 2. No demo in that window. Crawl hatch is under the back stairs.",
    structures: ["crawl space", "master bath", "subfloor"],
    photo: "gr-17",
    lat: 47.9158, lng: -122.2904,
  },
  {
    id: "pr16",
    customerId: "c14",
    address: "13718 Village Green Dr",
    city: "Mill Creek",
    zip: "98012",
    yearBuilt: 1998,
    accessNotes: "HOA. Scaffold permit needed from the HOA before anything goes up. Ted handles it.",
    structures: ["siding", "sheathing", "window flashing", "trim"],
    photo: "gr-05",
    lat: 47.8625, lng: -122.1995,
  },
  {
    id: "pr17",
    customerId: "c15",
    address: "7042 67th Ave NE",
    city: "Marysville",
    zip: "98270",
    yearBuilt: 1981,
    accessNotes: "Two dogs, inside when we work. Crawl hatch on the north side, screwed shut.",
    structures: ["crawl space", "rear deck", "drainage"],
    photo: "gr-19",
    lat: 48.0518, lng: -122.1691,
  },
  {
    id: "pr18",
    customerId: "c16",
    address: "2216 Colby Ave",
    city: "Everett",
    zip: "98201",
    yearBuilt: 1922,
    accessNotes: "Old house, tight crawl. Kitchen bump-out was added in the 70s and is the problem area.",
    structures: ["crawl space", "sill plate", "kitchen bump-out", "rear deck"],
    photo: "gr-15",
    lat: 47.9766, lng: -122.1909,
  },
];

/* =====================================================================
 * JOBS — 24, every stage on the board represented.
 *
 * stage / blocker / payment / schedule / nextAction are five independent
 * fields on purpose (types.ts §8). A job can be in_progress, unblocked,
 * partially paid and still have an overdue next action.
 *
 * Six jobs are actually blocked: j11 j13 j15 j17 j19 j20.
 * Two are deliberately unassigned: j2 j3.
 * Four next actions are already overdue against NOW: j1 j13 j15 j21.
 * ===================================================================== */

const jobs: Job[] = [
  /* ---- new leads (3) ---------------------------------------------- */
  {
    id: "j1",
    customerId: "c1",
    propertyId: "pr1",
    title: "Soft deck boards at the kitchen slider",
    stage: "new_lead",
    ownerId: "p2",
    blocker: null,
    payment: "none",
    schedule: "unscheduled",
    nextAction: {
      label: "Call Dana back about the deck boards",
      dueAt: onDay(-1, 17, 30),
      ownerId: "p2",
    },
    scopeSummary: "Three or four deck boards flex underfoot right outside the slider; check the framing below before quoting boards.",
    valueCents: 240000,
    workType: "deck",
    source: "nextdoor",
    createdAt: onDay(-2, 19, 40),
    crewIds: [],
    tags: ["deck", "existing customer"],
  },
  {
    id: "j2",
    customerId: "c2",
    propertyId: "pr2",
    title: "Rot at the garage door trim, south elevation",
    stage: "new_lead",
    ownerId: null,
    blocker: null,
    payment: "none",
    schedule: "unscheduled",
    nextAction: {
      label: "First call — website form came in Tuesday",
      dueAt: onDay(0, 11, 0),
      ownerId: null,
    },
    scopeSummary: "Trim and jamb rotted at the base of the garage door on the weather side; likely siding and sheathing behind it.",
    valueCents: 182500,
    workType: "siding",
    source: "google",
    createdAt: onDay(-2, 14, 22),
    crewIds: [],
    tags: ["siding", "web form"],
  },
  {
    id: "j3",
    customerId: "c6",
    propertyId: "pr7",
    title: "Musty crawl space, wet spot under the laundry",
    stage: "new_lead",
    ownerId: null,
    blocker: null,
    payment: "none",
    schedule: "unscheduled",
    nextAction: {
      label: "First call — Ron left a voicemail last night",
      dueAt: onDay(0, 14, 0),
      ownerId: null,
    },
    scopeSummary: "Smell in the hall and a damp patch on the laundry floor; needs a crawl inspection before anything gets priced.",
    valueCents: 358000,
    workType: "crawl",
    source: "yard_sign",
    createdAt: onDay(-1, 18, 12),
    crewIds: [],
    tags: ["crawl space", "moisture"],
  },

  /* ---- qualifying (2) --------------------------------------------- */
  {
    id: "j4",
    customerId: "c7",
    propertyId: "pr8",
    title: "Crawl space moisture and vapor barrier",
    stage: "qualifying",
    ownerId: "p2",
    blocker: null,
    payment: "none",
    schedule: "unscheduled",
    nextAction: {
      label: "Confirm crawl hatch access, then book the inspection",
      dueAt: onDay(0, 13, 0),
      ownerId: "p2",
    },
    scopeSummary: "Standing humidity and a torn barrier reported; scope the crawl while the deck crew is already on site.",
    valueCents: 1248000,
    workType: "deck",
    source: "google",
    createdAt: onDay(-6, 9, 15),
    crewIds: [],
    tags: ["crawl space", "same customer as j19"],
  },
  {
    id: "j5",
    customerId: "c12",
    propertyId: "pr14",
    title: "Rear deck framing, bounce at the stair landing",
    stage: "qualifying",
    ownerId: "p2",
    blocker: null,
    payment: "none",
    schedule: "unscheduled",
    nextAction: {
      label: "Text Jamal for photos of the under-deck framing",
      dueAt: onDay(1, 9, 0),
      ownerId: "p2",
    },
    scopeSummary: "Landing moves under load; find out whether it is the stringer, the post or the ledger before booking a trip.",
    valueCents: 976500,
    workType: "deck",
    source: "referral",
    createdAt: onDay(-4, 17, 50),
    crewIds: [],
    tags: ["deck"],
  },

  /* ---- inspection booked (2) -------------------------------------- */
  {
    id: "j6",
    customerId: "c13",
    propertyId: "pr15",
    title: "Crawl space rot below the master bath",
    stage: "inspection_booked",
    ownerId: "p2",
    blocker: null,
    payment: "none",
    schedule: "confirmed",
    nextAction: {
      label: "Inspection at 10:00 — bring the meter and the borescope",
      dueAt: onDay(0, 10, 0),
      ownerId: "p2",
    },
    scopeSummary: "Soft spot at the bath threshold and a stain on the crawl barrier directly below it; confirm the source before quoting.",
    valueCents: 1596000,
    workType: "crawl",
    source: "referral",
    createdAt: onDay(-5, 11, 20),
    crewIds: [],
    tags: ["crawl space", "bath"],
  },
  {
    id: "j7",
    customerId: "c15",
    propertyId: "pr17",
    title: "Deck ledger pulling away from the band board",
    stage: "inspection_booked",
    ownerId: "p2",
    blocker: null,
    payment: "none",
    schedule: "confirmed",
    nextAction: {
      label: "Inspection Friday 9:30 — pull a board to see the flashing",
      dueAt: onDay(1, 9, 30),
      ownerId: "p2",
    },
    scopeSummary: "Visible gap between ledger and house at the east end; treat as structural until proven otherwise.",
    valueCents: 718000,
    workType: "deck",
    source: "nextdoor",
    createdAt: onDay(-3, 13, 5),
    crewIds: [],
    tags: ["deck", "repeat customer"],
  },

  /* ---- inspection done (2) ---------------------------------------- */
  {
    id: "j8",
    customerId: "c5",
    propertyId: "pr6",
    title: "Crawl space joist and subfloor repair",
    stage: "inspection_done",
    ownerId: "p2",
    blocker: null,
    payment: "none",
    schedule: "unscheduled",
    nextAction: {
      label: "Write the estimate from Tuesday's findings",
      dueAt: onDay(0, 16, 0),
      ownerId: "p2",
    },
    scopeSummary: "Rim and two joists rotted at the northeast corner plus a wet sill under the kitchen bump-out; six findings logged.",
    valueCents: 2142000,
    workType: "crawl",
    source: "referral",
    createdAt: onDay(-9, 16, 50),
    crewIds: [],
    tags: ["crawl space", "joists"],
  },
  {
    id: "j9",
    customerId: "c9",
    propertyId: "pr10",
    title: "Rear deck rebuild: ledger, posts, framing",
    stage: "inspection_done",
    ownerId: "p1",
    blocker: null,
    payment: "none",
    schedule: "unscheduled",
    nextAction: {
      label: "Price the deck two ways — repair and full rebuild",
      dueAt: onDay(1, 12, 0),
      ownerId: "p1",
    },
    scopeSummary: "No ledger flashing anywhere on the run and a rotted rim at the outside corner; customer wants repair and rebuild priced side by side.",
    valueCents: 1387500,
    workType: "deck",
    source: "google",
    createdAt: onDay(-14, 8, 25),
    crewIds: [],
    tags: ["deck", "two options"],
  },

  /* ---- estimate draft (2) ----------------------------------------- */
  {
    id: "j10",
    customerId: "c8",
    propertyId: "pr9",
    title: "Full crawl space remediation and joist repair",
    stage: "estimate_draft",
    ownerId: "p2",
    blocker: null,
    payment: "none",
    schedule: "unscheduled",
    nextAction: {
      label: "Finish the draft and send it before the weekend",
      dueAt: onDay(0, 17, 0),
      ownerId: "p2",
    },
    scopeSummary: "Sister 84lf of joists, replace the north and east rim, new subfloor under the hall and a full 10-mil barrier.",
    valueCents: 2658200,
    workType: "crawl",
    source: "google",
    createdAt: onDay(-11, 10, 5),
    crewIds: [],
    tags: ["crawl space", "repeat customer"],
  },
  {
    id: "j11",
    customerId: "c16",
    propertyId: "pr18",
    title: "Sill plate and band board, kitchen bump-out",
    stage: "estimate_draft",
    ownerId: "p2",
    blocker: {
      kind: "permit",
      label: "City of Everett structural review, submitted 6 days ago",
      since: onDay(-6, 9, 40),
      owner: "p2",
    },
    payment: "none",
    schedule: "unscheduled",
    nextAction: {
      label: "Chase the Everett structural permit review",
      dueAt: onDay(4, 10, 0),
      ownerId: "p2",
    },
    scopeSummary: "Shore the bump-out, swap 22lf of sill and band board, patch the subfloor and close it back up paint-ready.",
    valueCents: 1341600,
    workType: "crawl",
    source: "referral",
    createdAt: onDay(-19, 14, 30),
    crewIds: [],
    tags: ["sill plate", "permit", "1922 house"],
  },

  /* ---- estimate sent (3) ------------------------------------------ */
  {
    id: "j12",
    customerId: "c14",
    propertyId: "pr16",
    title: "Exterior envelope: siding, sheathing, window flashing",
    stage: "estimate_sent",
    ownerId: "p1",
    blocker: null,
    payment: "none",
    schedule: "unscheduled",
    nextAction: {
      label: "Follow up on the envelope bid — he is holding three",
      dueAt: onDay(1, 10, 0),
      ownerId: "p1",
    },
    scopeSummary: "Strip 3200sf of siding, replace the wet sheathing, flash 16 openings properly and re-side with fiber cement.",
    valueCents: 6458600,
    workType: "siding",
    source: "referral",
    createdAt: onDay(-38, 9, 10),
    crewIds: [],
    tags: ["envelope", "big job", "thin margin"],
  },
  {
    id: "j13",
    customerId: "c11",
    propertyId: "pr12",
    title: "Crawl space rot repair below the main bath",
    stage: "estimate_sent",
    ownerId: "p2",
    blocker: {
      kind: "awaiting_customer",
      label: "Karen opened the estimate 6 days ago and has not answered since",
      since: onDay(-6, 19, 22),
      owner: "p2",
    },
    payment: "none",
    schedule: "unscheduled",
    nextAction: {
      label: "Call Karen — she opened the estimate six days ago",
      dueAt: onDay(-1, 16, 0),
      ownerId: "p2",
    },
    scopeSummary: "Sister 38lf below the bath, replace the subfloor around the tub and flange, new barrier and a 16lf rim section.",
    valueCents: 1252080,
    workType: "crawl",
    source: "repeat",
    createdAt: onDay(-16, 10, 40),
    crewIds: [],
    tags: ["crawl space", "follow up overdue"],
  },
  {
    id: "j14",
    customerId: "c4",
    propertyId: "pr5",
    title: "Front porch post and beam replacement",
    stage: "estimate_sent",
    ownerId: "p1",
    blocker: null,
    payment: "none",
    schedule: "unscheduled",
    nextAction: {
      label: "Check in on the porch estimate",
      dueAt: onDay(4, 11, 0),
      ownerId: "p1",
    },
    scopeSummary: "Shore the porch roof, replace three 6x6 posts on standoff bases and 18lf of beam, leave it primed.",
    valueCents: 794400,
    workType: "crawl",
    source: "yard_sign",
    createdAt: onDay(-15, 11, 0),
    crewIds: [],
    tags: ["porch", "posts"],
  },

  /* ---- approved, deposit not collected (1) ------------------------ */
  {
    id: "j15",
    customerId: "c12",
    propertyId: "pr14",
    title: "Crawl space joist sistering and vapor barrier",
    stage: "approved",
    ownerId: "p1",
    blocker: {
      kind: "awaiting_deposit",
      label: "Card declined Tuesday, deposit still outstanding",
      since: onDay(-2, 11, 6),
      owner: "p5",
    },
    payment: "deposit_due",
    schedule: "tentative",
    nextAction: {
      label: "Re-run the deposit — card declined Tuesday",
      dueAt: onDay(-2, 12, 0),
      ownerId: "p5",
    },
    scopeSummary: "Sister 96lf, replace the west rim and the laundry subfloor, two new piers at the girder and a full 10-mil barrier.",
    valueCents: 2171300,
    workType: "crawl",
    source: "referral",
    createdAt: onDay(-24, 15, 20),
    crewIds: ["p3"],
    tags: ["crawl space", "deposit"],
  },

  /* ---- scheduled (2) ---------------------------------------------- */
  {
    id: "j16",
    customerId: "c15",
    propertyId: "pr17",
    title: "Crawl space vapor barrier and drainage sump",
    stage: "scheduled",
    ownerId: "p1",
    blocker: null,
    payment: "deposit_paid",
    schedule: "confirmed",
    nextAction: {
      label: "Confirm the Monday start with Colleen",
      dueAt: onDay(1, 15, 0),
      ownerId: "p5",
    },
    scopeSummary: "Pull the old barrier, cut in a sump and discharge line at the low corner, new 10-mil pinned and sealed.",
    valueCents: 1742600,
    workType: "crawl",
    source: "repeat",
    createdAt: onDay(-27, 9, 0),
    crewIds: ["p3", "p4"],
    tags: ["crawl space", "drainage"],
  },
  {
    id: "j17",
    customerId: "c8",
    propertyId: "pr9",
    title: "Rebuild the rear deck landing and stairs",
    stage: "scheduled",
    ownerId: "p1",
    blocker: {
      kind: "weather",
      label: "Atmospheric river forecast Tue into Wed — framing start at risk",
      since: onDay(-1, 7, 40),
      owner: "p1",
    },
    payment: "deposit_paid",
    schedule: "confirmed",
    nextAction: {
      label: "Watch the Wednesday forecast, call Bryce if it slips",
      dueAt: onDay(5, 7, 30),
      ownerId: "p1",
    },
    scopeSummary: "Tear out the landing and stairs, new PT stringers and treads on a proper footing, rail to code.",
    valueCents: 1118400,
    workType: "deck",
    source: "repeat",
    createdAt: onDay(-30, 13, 45),
    crewIds: ["p1", "p4"],
    tags: ["deck", "stairs", "weather"],
  },

  /* ---- in progress (3) -------------------------------------------- */
  {
    id: "j18",
    customerId: "c3",
    propertyId: "pr3",
    title: "Crawl space rot: rim joist, sistering, new barrier",
    stage: "in_progress",
    ownerId: "p1",
    blocker: null,
    payment: "deposit_paid",
    schedule: "in_progress",
    nextAction: {
      label: "Walk Tino through the east rim before close of day",
      dueAt: onDay(0, 15, 0),
      ownerId: "p1",
    },
    scopeSummary: "Day four of six: north rim is replaced, bays 4 through 6 sistered, subfloor under the bath goes in today.",
    valueCents: 2661800,
    costToDateCents: 984300,
    workType: "crawl",
    source: "repeat",
    createdAt: onDay(-33, 10, 15),
    crewIds: ["p3", "p4"],
    tags: ["crawl space", "rental", "change order pending"],
  },
  {
    id: "j19",
    customerId: "c7",
    propertyId: "pr8",
    title: "Deck rebuild: ledger, flashing, joists, decking",
    stage: "in_progress",
    ownerId: "p1",
    blocker: {
      kind: "awaiting_materials",
      label: "Glulam beam and hangers on will-call, Dunn Lumber says Monday 7am",
      since: onDay(-1, 14, 10),
      owner: "p5",
    },
    payment: "partially_paid",
    schedule: "in_progress",
    nextAction: {
      label: "Confirm the glulam delivery for Monday 7am",
      dueAt: onDay(0, 9, 0),
      ownerId: "p5",
    },
    scopeSummary: "Ledger and five joists are out, wall is open 11ft; framing stops until the beam lands Monday.",
    valueCents: 1984200,
    costToDateCents: 712600,
    workType: "deck",
    source: "google",
    createdAt: onDay(-41, 12, 30),
    crewIds: ["p1", "p4"],
    tags: ["deck", "ledger", "materials"],
  },
  {
    id: "j20",
    customerId: "c10",
    propertyId: "pr11",
    title: "Water damage: subfloor, joists, interior wall base",
    stage: "in_progress",
    ownerId: "p1",
    blocker: {
      kind: "awaiting_access",
      label: "Back unit tenant has not unlocked — north crawl bay still uninspected",
      since: onDay(-1, 8, 30),
      owner: "p5",
    },
    payment: "deposit_paid",
    schedule: "in_progress",
    nextAction: {
      label: "Send Renae the moisture log before she closes the file",
      dueAt: onDay(0, 17, 0),
      ownerId: "p1",
    },
    scopeSummary: "Kitchen subfloor and two joists out, drying equipment running; second source found behind the hall vanity and approved.",
    valueCents: 4120000,
    costToDateCents: 1608900,
    workType: "water",
    source: "insurance",
    createdAt: onDay(-31, 12, 5),
    crewIds: ["p1", "p3"],
    tags: ["insurance", "PEMCO", "water damage", "duplex"],
  },

  /* ---- punch list (1) --------------------------------------------- */
  {
    id: "j21",
    customerId: "c1",
    propertyId: "pr1",
    title: "Crawl space rot repair — punch list",
    stage: "punch_list",
    ownerId: "p1",
    blocker: null,
    payment: "overdue",
    schedule: "confirmed",
    nextAction: {
      label: "Send Dana the punch photos and the past-due invoice",
      dueAt: onDay(-1, 15, 0),
      ownerId: "p5",
    },
    scopeSummary: "Three items left: reseal the barrier at the hatch, replace one vent screen, touch up the garage jamb.",
    valueCents: 1562000,
    costToDateCents: 861400,
    workType: "crawl",
    source: "referral",
    createdAt: onDay(-62, 9, 30),
    crewIds: ["p3"],
    tags: ["punch", "invoice overdue"],
  },

  /* ---- complete (1) and warranty (1) ------------------------------ */
  {
    id: "j22",
    customerId: "c11",
    propertyId: "pr13",
    title: "Subfloor and joist repair, upstairs bath",
    stage: "complete",
    ownerId: "p1",
    blocker: null,
    payment: "paid",
    schedule: "done",
    nextAction: null,
    scopeSummary: "Closed out and paid in full; barrier photos and the moisture log are on file for the tenant turnover.",
    valueCents: 2384500,
    costToDateCents: 1318700,
    workType: "deck",
    source: "repeat",
    createdAt: onDay(-96, 10, 0),
    crewIds: ["p3", "p4"],
    tags: ["closed", "rental"],
    warrantyUntil: onDay(304, 17, 0),
  },
  {
    id: "j23",
    customerId: "c3",
    propertyId: "pr4",
    title: "Deck ledger reflash — warranty callback",
    stage: "warranty",
    ownerId: "p1",
    blocker: null,
    payment: "paid",
    schedule: "done",
    nextAction: {
      label: "Warranty look at the ledger Saturday, 9am",
      dueAt: onDay(9, 9, 0),
      ownerId: "p3",
    },
    scopeSummary: "Paid job from the spring; Hollis reported a damp trim board, so we pull the cap flashing and look before winter.",
    valueCents: 1291000,
    costToDateCents: 702300,
    workType: "deck",
    source: "repeat",
    createdAt: onDay(-171, 11, 20),
    crewIds: ["p3"],
    tags: ["warranty", "ledger", "rental"],
    warrantyUntil: onDay(430, 17, 0),
  },

  /* ---- lost (1) --------------------------------------------------- */
  {
    id: "j24",
    customerId: "c16",
    propertyId: "pr18",
    title: "Rear deck rebuild",
    stage: "lost",
    ownerId: "p2",
    blocker: null,
    payment: "none",
    schedule: "unscheduled",
    nextAction: null,
    scopeSummary: "Lost on price — a handyman bid it 9k under us with no flashing detail and no permit. Vincent went with him.",
    valueCents: 2997200,
    workType: "deck",
    source: "google",
    createdAt: onDay(-287, 11, 0),
    crewIds: [],
    tags: ["lost on price", "no permit in their bid"],
  },
];

/* =====================================================================
 * FINDINGS — 34, written the way the crew writes them on the tablet.
 *
 * moisturePct is only present where somebody actually put a meter on it.
 * Anything under 16 reads dry and is logged on purpose, so the estimate can
 * show where the damage stops.
 *
 * Six are new damage (f16 f17 f18 f23 f26 f31). Two of those (f16, f17) hang
 * off change order co1.
 * ===================================================================== */

const findings: Finding[] = [
  /* ---- j8 · Nakamura, Mukilteo crawl · inspected Tuesday by Dre ---- */
  {
    id: "f1",
    jobId: "j8",
    location: "NE crawl space, bay 2",
    title: "Rim joist soft at the northeast corner",
    severity: "structural",
    moisturePct: 31,
    measurement: "Probe sinks 1-1/4in, soft to 22in along the rim",
    note: "Downspout dumps at that corner with no extension. Fix the water first or we will be back.",
    photoIds: ["ph1"],
    discoveredAt: onDay(-2, 9, 24),
    discoveredBy: "p2",
    isNewDamage: false,
  },
  {
    id: "f2",
    jobId: "j8",
    location: "Crawl space, bay 4",
    title: "Two floor joists punky at the bearing end",
    severity: "structural",
    moisturePct: 28,
    measurement: "Joists 4 and 5 soft to 14in from the north corner",
    note: "Sisterable. No crush at the girder yet.",
    photoIds: ["ph2"],
    discoveredAt: onDay(-2, 9, 38),
    discoveredBy: "p2",
    isNewDamage: false,
  },
  {
    id: "f3",
    jobId: "j8",
    location: "Under the kitchen bump-out",
    title: "26% MC at the sill plate under the kitchen bump-out",
    severity: "active",
    moisturePct: 26,
    measurement: "Wet across the full 6ft of bump-out sill, dry 3ft either side",
    note: "No plumbing above it. Reads like grade water, not a leak.",
    photoIds: ["ph3"],
    discoveredAt: onDay(-2, 9, 51),
    discoveredBy: "p2",
    isNewDamage: false,
  },
  {
    id: "f4",
    jobId: "j8",
    location: "Crawl space, center beam line",
    title: "Pier block settled, post is not bearing",
    severity: "active",
    measurement: "3/4in gap at the post cap, you can spin the shim out by hand",
    note: "Explains the dip in the hall floor.",
    photoIds: ["ph4"],
    discoveredAt: onDay(-2, 10, 2),
    discoveredBy: "p2",
    isNewDamage: false,
  },
  {
    id: "f5",
    jobId: "j8",
    location: "Crawl space, full floor",
    title: "Vapor barrier torn and displaced, about 40% coverage",
    severity: "monitor",
    measurement: "Roughly 560sf of the 1400sf floor still covered",
    note: "Original 6-mil, brittle. Replace, do not patch.",
    photoIds: ["ph5"],
    discoveredAt: onDay(-2, 10, 9),
    discoveredBy: "p2",
    isNewDamage: false,
  },
  {
    id: "f6",
    jobId: "j8",
    location: "Foundation vent, west wall",
    title: "Vent screen missing, rodent runs through the insulation",
    severity: "monitor",
    moisturePct: 14,
    measurement: "Framing at the vent reads 14, dry",
    note: "Not our scope but Grace should know before we close it up.",
    photoIds: ["ph6"],
    discoveredAt: onDay(-2, 10, 16),
    discoveredBy: "p2",
    isNewDamage: false,
  },

  /* ---- j9 · Petrosyan, Bothell deck · inspected Wednesday by Dre --- */
  {
    id: "f7",
    jobId: "j9",
    location: "Deck ledger, full run",
    title: "Ledger flashing missing, water tracking behind the band board",
    severity: "structural",
    moisturePct: 29,
    measurement: "No flashing anywhere on the 24ft run, band board wet the whole length",
    note: "Lag bolts only, no structural screws. This is the whole job right here.",
    photoIds: ["ph7"],
    discoveredAt: onDay(-1, 8, 41),
    discoveredBy: "p2",
    isNewDamage: false,
  },
  {
    id: "f8",
    jobId: "j9",
    location: "Deck framing, south rim",
    title: "Rim joist rotted through at the outside corner",
    severity: "structural",
    moisturePct: 34,
    measurement: "Screwdriver goes through the rim, 30in of open rot",
    photoIds: ["ph8"],
    discoveredAt: onDay(-1, 8, 52),
    discoveredBy: "p2",
    isNewDamage: false,
  },
  {
    id: "f9",
    jobId: "j9",
    location: "Post base, east corner",
    title: "Post sits flat on the slab, no standoff, base end punky",
    severity: "active",
    moisturePct: 27,
    measurement: "Bottom 5in of the 4x4 is soft on three faces",
    note: "Undersized post for that span anyway. Rebuild option should go to 6x6.",
    photoIds: ["ph9"],
    discoveredAt: onDay(-1, 9, 3),
    discoveredBy: "p2",
    isNewDamage: false,
  },
  {
    id: "f10",
    jobId: "j9",
    location: "Decking, stair landing",
    title: "Six decking boards cupped and soft at the fasteners",
    severity: "active",
    moisturePct: 24,
    measurement: "Boards 3 through 8 on the landing, screws spinning in wet wood",
    photoIds: ["ph10"],
    discoveredAt: onDay(-1, 9, 14),
    discoveredBy: "p2",
    isNewDamage: false,
  },
  {
    id: "f11",
    jobId: "j9",
    location: "House wall above the ledger",
    title: "Siding sound above the ledger line",
    severity: "monitor",
    moisturePct: 13,
    measurement: "Reads 13 at three points above the flashing line, dry",
    note: "Good news for the quote — the damage stops at the ledger.",
    photoIds: ["ph11"],
    discoveredAt: onDay(-1, 9, 22),
    discoveredBy: "p2",
    isNewDamage: false,
  },

  /* ---- j18 · Brandt rental, Everett crawl · live job -------------- */
  {
    id: "f12",
    jobId: "j18",
    location: "Crawl space, bay 4",
    title: "Rim joist soft to 14in from the north corner",
    severity: "structural",
    moisturePct: 30,
    measurement: "Soft 14in in from the corner, sound past 26in",
    note: "Matches what Dre wrote up in August. Cut back to the second joist.",
    photoIds: ["ph12"],
    discoveredAt: onDay(-3, 8, 12),
    discoveredBy: "p3",
    isNewDamage: false,
  },
  {
    id: "f13",
    jobId: "j18",
    location: "Crawl space, bay 6",
    title: "Joist end rotted at the girder, hanger rusted through",
    severity: "structural",
    moisturePct: 32,
    measurement: "Bearing end gone, hanger crumbles in hand",
    note: "Hanger was a galvanized interior hanger in a wet crawl. Replacing with ZMAX.",
    photoIds: ["ph13"],
    discoveredAt: onDay(-3, 9, 5),
    discoveredBy: "p3",
    isNewDamage: false,
  },
  {
    id: "f14",
    jobId: "j18",
    location: "Crawl space, under the main bath",
    title: "Subfloor delaminated 3ft by 4ft below the tub",
    severity: "structural",
    moisturePct: 33,
    measurement: "Plies separating across 12sf, tub drain dripping at the slip joint",
    note: "Told Hollis the plumber has to hit the slip joint before we sheet it.",
    photoIds: ["ph14"],
    discoveredAt: onDay(-2, 10, 40),
    discoveredBy: "p3",
    isNewDamage: false,
  },
  {
    id: "f15",
    jobId: "j18",
    location: "Crawl space, south wall",
    title: "Sill plate wet the full 18ft run",
    severity: "active",
    moisturePct: 24,
    measurement: "24% MC average across 18ft, no rot yet",
    note: "Barrier and a downspout extension should dry it. Monitor, do not replace.",
    photoIds: ["ph15"],
    discoveredAt: onDay(-2, 11, 18),
    discoveredBy: "p3",
    isNewDamage: false,
  },
  {
    id: "f16",
    jobId: "j18",
    location: "Crawl space, west girder",
    title: "Girder splice unsupported, post missing",
    severity: "structural",
    measurement: "Splice lands 19in off the nearest pier with nothing under it",
    note: "Not in the original scope. Nobody could see it until the insulation came down.",
    photoIds: ["ph16"],
    discoveredAt: onDay(-1, 13, 25),
    discoveredBy: "p3",
    isNewDamage: true,
    changeOrderId: "co1",
  },
  {
    id: "f17",
    jobId: "j18",
    location: "Crawl space, bay 9",
    title: "Second run of joists soft where the shower drain passes",
    severity: "structural",
    moisturePct: 29,
    measurement: "Three joists soft 10in either side of the drain, 26lf total",
    note: "Same story as bay 6. Goes on the change order with the girder post.",
    photoIds: ["ph17"],
    discoveredAt: onDay(-1, 13, 44),
    discoveredBy: "p3",
    isNewDamage: true,
    changeOrderId: "co1",
  },
  {
    id: "f18",
    jobId: "j18",
    location: "Crawl space, center low spot",
    title: "Standing water after Monday night rain",
    severity: "active",
    measurement: "About 1/2in deep over a 4ft by 6ft low spot",
    note: "Was dry Monday morning. Grading outside dumps toward the hatch.",
    photoIds: ["ph18"],
    discoveredAt: onDay(0, 7, 5),
    discoveredBy: "p3",
    isNewDamage: true,
  },
  {
    id: "f19",
    jobId: "j18",
    location: "Crawl space, north wall",
    title: "Insulation fallen in bays 1 through 5, wet and matted",
    severity: "monitor",
    moisturePct: 21,
    measurement: "Roughly 180sf of batt on the ground",
    note: "Bagging it as we go. Replacement is in the original scope.",
    photoIds: ["ph19"],
    discoveredAt: onDay(-3, 9, 30),
    discoveredBy: "p4",
    isNewDamage: false,
  },

  /* ---- j19 · Duclos, Shoreline deck · live job -------------------- */
  {
    id: "f20",
    jobId: "j19",
    location: "Deck ledger, west run",
    title: "Ledger bolted through siding with no flashing",
    severity: "structural",
    moisturePct: 31,
    measurement: "11ft of band board wet behind the ledger, worst at the west end",
    note: "Whoever built it lagged straight through the lap siding. Classic.",
    photoIds: ["ph22"],
    discoveredAt: onDay(-3, 8, 30),
    discoveredBy: "p1",
    isNewDamage: false,
  },
  {
    id: "f21",
    jobId: "j19",
    location: "Deck framing, joists 3 through 7",
    title: "Five joists soft at the ledger hangers",
    severity: "structural",
    moisturePct: 28,
    measurement: "Soft 8in to 12in back from the hanger on each of the five",
    photoIds: ["ph23"],
    discoveredAt: onDay(-3, 9, 10),
    discoveredBy: "p1",
    isNewDamage: false,
  },
  {
    id: "f22",
    jobId: "j19",
    location: "Deck posts, south side",
    title: "Post buried 4in in the planter bed, rotted at grade",
    severity: "structural",
    moisturePct: 30,
    measurement: "6x6 rotted through two faces at the soil line",
    note: "Planter has to come out or it happens again.",
    photoIds: ["ph24"],
    discoveredAt: onDay(-3, 10, 2),
    discoveredBy: "p1",
    isNewDamage: false,
  },
  {
    id: "f23",
    jobId: "j19",
    location: "House band board behind the ledger",
    title: "Band board rotted, 11ft run needs replacement",
    severity: "structural",
    moisturePct: 33,
    measurement: "Full 11ft soft, 1-1/2in deep at the west end",
    note: "Found once the ledger came off. This is why the glulam order changed.",
    photoIds: ["ph25"],
    discoveredAt: onDay(-2, 11, 20),
    discoveredBy: "p1",
    isNewDamage: true,
  },
  {
    id: "f24",
    jobId: "j19",
    location: "Deck stairs",
    title: "Stringer cracked at the third tread",
    severity: "active",
    measurement: "Crack runs 9in from the notch, through the grain",
    note: "Taping it off. Nobody uses those stairs until the rebuild.",
    photoIds: ["ph26"],
    discoveredAt: onDay(-2, 12, 5),
    discoveredBy: "p4",
    isNewDamage: false,
  },
  {
    id: "f25",
    jobId: "j19",
    location: "Rim joist, east end",
    title: "East rim reads 14, sound",
    severity: "monitor",
    moisturePct: 14,
    measurement: "14% MC at four points, probe will not enter",
    note: "Damage stops 3ft short of the east post. Scope ends there.",
    photoIds: ["ph27"],
    discoveredAt: onDay(-2, 12, 30),
    discoveredBy: "p1",
    isNewDamage: false,
  },
  {
    id: "f26",
    jobId: "j19",
    location: "Wall sheathing behind the ledger",
    title: "Sheathing soft for 8ft of the 11ft run, studs dry",
    severity: "active",
    moisturePct: 26,
    measurement: "8ft of 1/2in ply soft, studs behind read 15",
    note: "Studs are fine. Sheathing and band board only.",
    photoIds: ["ph28"],
    discoveredAt: onDay(-1, 9, 15),
    discoveredBy: "p1",
    isNewDamage: true,
  },

  /* ---- j20 · Trimble duplex, Everett water damage · live job ------ */
  {
    id: "f27",
    jobId: "j20",
    location: "Kitchen, under the dishwasher",
    title: "Subfloor swollen and delaminated, 5ft by 4ft",
    severity: "structural",
    moisturePct: 32,
    measurement: "20sf delaminated, worst directly under the dishwasher pan",
    note: "Supply line at the dishwasher is the source the adjuster wrote up.",
    photoIds: ["ph30"],
    discoveredAt: onDay(-1, 8, 45),
    discoveredBy: "p1",
    isNewDamage: false,
  },
  {
    id: "f28",
    jobId: "j20",
    location: "Crawl space, bay 1 below the kitchen",
    title: "Two joists wet the full span",
    severity: "structural",
    moisturePct: 29,
    measurement: "Both joists 29% end to end, soft 18in under the dishwasher",
    photoIds: ["ph31"],
    discoveredAt: onDay(-1, 9, 20),
    discoveredBy: "p3",
    isNewDamage: false,
  },
  {
    id: "f29",
    jobId: "j20",
    location: "Kitchen north wall base",
    title: "Bottom plate wet 9ft, drywall wicked to 16in",
    severity: "active",
    moisturePct: 27,
    measurement: "Plate wet 9ft, drywall cut line at 24in to be safe",
    photoIds: ["ph32"],
    discoveredAt: onDay(-1, 10, 5),
    discoveredBy: "p1",
    isNewDamage: false,
  },
  {
    id: "f30",
    jobId: "j20",
    location: "Crawl space, bay 3",
    title: "Insulation saturated, batts hanging off the joists",
    severity: "active",
    moisturePct: 25,
    measurement: "Roughly 140sf soaked, pulling and bagging",
    photoIds: ["ph33"],
    discoveredAt: onDay(-1, 10, 40),
    discoveredBy: "p3",
    isNewDamage: false,
  },
  {
    id: "f31",
    jobId: "j20",
    location: "Hall bath, behind the vanity",
    title: "Second source — supply line dripping behind the vanity",
    severity: "active",
    moisturePct: 30,
    measurement: "Angle stop weeping, plate wet 30in either side",
    note: "Not in the adjuster scope. Photographed, called Renae, she added it same day.",
    photoIds: ["ph34"],
    discoveredAt: onDay(0, 6, 50),
    discoveredBy: "p1",
    isNewDamage: true,
  },
  {
    id: "f32",
    jobId: "j20",
    location: "Crawl space, north bay under the back unit",
    title: "No access — tenant lock, not inspected",
    severity: "monitor",
    measurement: "Hatch padlocked, no key on site",
    note: "Logged as uninspected so it does not read as clear on the adjuster report.",
    photoIds: ["ph35"],
    discoveredAt: onDay(0, 7, 2),
    discoveredBy: "p1",
    isNewDamage: false,
  },
  {
    id: "f33",
    jobId: "j20",
    location: "Kitchen, at the slider jamb",
    title: "Slider jamb reads 12, dry",
    severity: "monitor",
    moisturePct: 12,
    measurement: "12% MC at the jamb and sill, dry",
    note: "Water never reached the slider. Keeps 40sf of flooring out of the claim.",
    photoIds: ["ph36"],
    discoveredAt: onDay(0, 7, 10),
    discoveredBy: "p1",
    isNewDamage: false,
  },
  {
    id: "f34",
    jobId: "j20",
    location: "Crawl space, center girder",
    title: "Center girder dry, no rot found",
    severity: "monitor",
    moisturePct: 15,
    measurement: "15% MC at six points along the girder, probe will not enter",
    photoIds: ["ph37"],
    discoveredAt: onDay(-1, 11, 15),
    discoveredBy: "p3",
    isNewDamage: false,
  },
];

/* =====================================================================
 * PHOTOS — 48. Seeds cycle gr-01 … gr-26 and start over.
 *
 * j20 is a 1946 crawl space with no signal under the house: three photos are
 * still queued and one upload failed outright. That is a real field state and
 * the UI has to say so rather than pretend they are on the server.
 * ===================================================================== */

const photos: Photo[] = [
  /* ---- j8 inspection set ------------------------------------------ */
  { id: "ph1", jobId: "j8", findingId: "f1", seed: "gr-05", kind: "framing", caption: "NE rim, probe mark at 14in", capturedAt: onDay(-2, 9, 25), uploadedAt: onDay(-2, 11, 2), by: "p2", syncState: "synced", forReel: true },
  { id: "ph2", jobId: "j8", findingId: "f2", seed: "gr-19", kind: "framing", caption: "Bay 4, joists 4 and 5 bearing ends", capturedAt: onDay(-2, 9, 39), uploadedAt: onDay(-2, 11, 2), by: "p2", syncState: "synced", forReel: true },
  { id: "ph3", jobId: "j8", findingId: "f3", seed: "gr-07", kind: "moisture", caption: "Meter at the bump-out sill, 26", capturedAt: onDay(-2, 9, 52), uploadedAt: onDay(-2, 11, 2), by: "p2", syncState: "synced" },
  { id: "ph4", jobId: "j8", findingId: "f4", seed: "gr-12", kind: "framing", caption: "Post cap gap at the center beam", capturedAt: onDay(-2, 10, 3), uploadedAt: onDay(-2, 11, 3), by: "p2", syncState: "synced", forReel: true },
  { id: "ph5", jobId: "j8", findingId: "f5", seed: "gr-17", kind: "crawl", caption: "Barrier torn back across the middle bays", capturedAt: onDay(-2, 10, 10), uploadedAt: onDay(-2, 11, 3), by: "p2", syncState: "synced" },
  { id: "ph6", jobId: "j8", findingId: "f6", seed: "gr-09", kind: "crawl", caption: "West vent, screen gone", capturedAt: onDay(-2, 10, 17), uploadedAt: onDay(-2, 11, 3), by: "p2", syncState: "synced" },

  /* ---- j9 inspection set ------------------------------------------ */
  { id: "ph7", jobId: "j9", findingId: "f7", seed: "gr-06", kind: "deck", caption: "Ledger to siding, no flashing anywhere on the run", capturedAt: onDay(-1, 8, 42), uploadedAt: onDay(-1, 10, 15), by: "p2", syncState: "synced", forReel: true },
  { id: "ph8", jobId: "j9", findingId: "f8", seed: "gr-11", kind: "framing", caption: "South rim, screwdriver through it", capturedAt: onDay(-1, 8, 53), uploadedAt: onDay(-1, 10, 15), by: "p2", syncState: "synced" },
  { id: "ph9", jobId: "j9", findingId: "f9", seed: "gr-26", kind: "deck", caption: "East post sitting flat on the slab", capturedAt: onDay(-1, 9, 4), uploadedAt: onDay(-1, 10, 15), by: "p2", syncState: "synced" },
  { id: "ph10", jobId: "j9", findingId: "f10", seed: "gr-15", kind: "deck", caption: "Landing boards, cupped and spinning screws", capturedAt: onDay(-1, 9, 15), uploadedAt: onDay(-1, 10, 16), by: "p2", syncState: "synced" },
  { id: "ph11", jobId: "j9", findingId: "f11", seed: "gr-01", kind: "moisture", caption: "Siding above the ledger reads 13", capturedAt: onDay(-1, 9, 23), uploadedAt: onDay(-1, 10, 16), by: "p2", syncState: "synced" },

  /* ---- j18 live job ------------------------------------------------ */
  { id: "ph12", jobId: "j18", findingId: "f12", seed: "gr-03", kind: "framing", caption: "Bay 4 rim before demo", capturedAt: onDay(-3, 8, 14), uploadedAt: onDay(-3, 12, 40), by: "p3", syncState: "synced" },
  { id: "ph13", jobId: "j18", findingId: "f13", seed: "gr-08", kind: "framing", caption: "Bay 6 joist end and the failed hanger", capturedAt: onDay(-3, 9, 7), uploadedAt: onDay(-3, 12, 40), by: "p3", syncState: "synced" },
  { id: "ph14", jobId: "j18", findingId: "f14", seed: "gr-13", kind: "framing", caption: "Subfloor under the tub, plies separating", capturedAt: onDay(-2, 10, 42), uploadedAt: onDay(-2, 13, 5), by: "p3", syncState: "synced" },
  { id: "ph15", jobId: "j18", findingId: "f15", seed: "gr-05", kind: "moisture", caption: "South sill, 24 across the run", capturedAt: onDay(-2, 11, 20), uploadedAt: onDay(-2, 13, 5), by: "p3", syncState: "synced" },
  { id: "ph16", jobId: "j18", findingId: "f16", seed: "gr-19", kind: "framing", caption: "Girder splice with nothing under it", capturedAt: onDay(-1, 13, 27), uploadedAt: onDay(-1, 16, 10), by: "p3", syncState: "synced" },
  { id: "ph17", jobId: "j18", findingId: "f17", seed: "gr-07", kind: "framing", caption: "Bay 9, soft joists either side of the shower drain", capturedAt: onDay(-1, 13, 46), uploadedAt: onDay(-1, 16, 10), by: "p3", syncState: "synced" },
  { id: "ph18", jobId: "j18", findingId: "f18", seed: "gr-12", kind: "crawl", caption: "Water standing in the center low spot this morning", capturedAt: onDay(0, 7, 6), uploadedAt: onDay(0, 7, 9), by: "p3", syncState: "synced" },
  { id: "ph19", jobId: "j18", findingId: "f19", seed: "gr-17", kind: "crawl", caption: "North wall batts on the ground", capturedAt: onDay(-3, 9, 32), uploadedAt: onDay(-3, 12, 41), by: "p4", syncState: "synced" },
  { id: "ph20", jobId: "j18", seed: "gr-09", kind: "repair", caption: "North rim replaced, bays 4 to 6 sistered", capturedAt: onDay(-1, 15, 50), uploadedAt: onDay(-1, 16, 11), by: "p3", syncState: "synced" },
  { id: "ph21", jobId: "j18", seed: "gr-23", kind: "site", caption: "Hatch and containment at the north side", capturedAt: onDay(-3, 7, 40), uploadedAt: onDay(-3, 12, 41), by: "p4", syncState: "synced" },

  /* ---- j19 live job ------------------------------------------------ */
  { id: "ph22", jobId: "j19", findingId: "f20", seed: "gr-06", kind: "deck", caption: "Ledger lagged straight through the lap siding", capturedAt: onDay(-3, 8, 32), uploadedAt: onDay(-3, 11, 0), by: "p1", syncState: "synced" },
  { id: "ph23", jobId: "j19", findingId: "f21", seed: "gr-11", kind: "framing", caption: "Joists 3 to 7 at the hangers", capturedAt: onDay(-3, 9, 12), uploadedAt: onDay(-3, 11, 0), by: "p1", syncState: "synced" },
  { id: "ph24", jobId: "j19", findingId: "f22", seed: "gr-26", kind: "deck", caption: "South post at the planter, rotted at grade", capturedAt: onDay(-3, 10, 4), uploadedAt: onDay(-3, 11, 1), by: "p1", syncState: "synced" },
  { id: "ph25", jobId: "j19", findingId: "f23", seed: "gr-15", kind: "siding", caption: "Band board once the ledger came off", capturedAt: onDay(-2, 11, 22), uploadedAt: onDay(-2, 14, 30), by: "p1", syncState: "synced" },
  { id: "ph26", jobId: "j19", findingId: "f24", seed: "gr-01", kind: "deck", caption: "Cracked stringer, taped off", capturedAt: onDay(-2, 12, 7), uploadedAt: onDay(-2, 14, 30), by: "p4", syncState: "synced" },
  { id: "ph27", jobId: "j19", findingId: "f25", seed: "gr-03", kind: "moisture", caption: "East rim reads 14, scope stops here", capturedAt: onDay(-2, 12, 32), uploadedAt: onDay(-2, 14, 31), by: "p1", syncState: "synced" },
  { id: "ph28", jobId: "j19", findingId: "f26", seed: "gr-08", kind: "siding", caption: "Sheathing soft 8ft, studs behind read 15", capturedAt: onDay(-1, 9, 17), uploadedAt: onDay(-1, 12, 20), by: "p1", syncState: "synced" },
  { id: "ph29", jobId: "j19", seed: "gr-13", kind: "repair", caption: "Wall open 11ft, waiting on the beam", capturedAt: onDay(-1, 14, 5), uploadedAt: onDay(-1, 14, 40), by: "p1", syncState: "synced" },

  /* ---- j20 live job · crawl space has no signal -------------------- */
  { id: "ph30", jobId: "j20", findingId: "f27", seed: "gr-05", kind: "repair", caption: "Kitchen subfloor cut back past the dishwasher", capturedAt: onDay(-1, 8, 47), uploadedAt: onDay(-1, 12, 0), by: "p1", syncState: "synced" },
  { id: "ph31", jobId: "j20", findingId: "f28", seed: "gr-19", kind: "framing", caption: "Bay 1 joists, wet the whole span", capturedAt: onDay(-1, 9, 22), uploadedAt: onDay(-1, 12, 0), by: "p3", syncState: "synced" },
  { id: "ph32", jobId: "j20", findingId: "f29", seed: "gr-07", kind: "moisture", caption: "North wall plate, 27 at 9ft", capturedAt: onDay(-1, 10, 7), uploadedAt: onDay(-1, 12, 1), by: "p1", syncState: "synced" },
  { id: "ph33", jobId: "j20", findingId: "f30", seed: "gr-12", kind: "crawl", caption: "Bay 3 batts, saturated", capturedAt: onDay(-1, 10, 42), uploadedAt: onDay(-1, 12, 1), by: "p3", syncState: "synced" },
  { id: "ph34", jobId: "j20", findingId: "f31", seed: "gr-17", kind: "moisture", caption: "Angle stop weeping behind the hall vanity", capturedAt: onDay(0, 6, 52), by: "p1", syncState: "queued" },
  { id: "ph35", jobId: "j20", findingId: "f32", seed: "gr-09", kind: "crawl", caption: "North bay hatch, padlocked", capturedAt: onDay(0, 7, 3), by: "p1", syncState: "queued" },
  { id: "ph36", jobId: "j20", findingId: "f33", seed: "gr-06", kind: "moisture", caption: "Slider jamb reads 12", capturedAt: onDay(0, 7, 11), uploadedAt: onDay(0, 7, 14), by: "p1", syncState: "synced" },
  { id: "ph37", jobId: "j20", findingId: "f34", seed: "gr-11", kind: "crawl", caption: "Center girder, six meter points", capturedAt: onDay(-1, 11, 17), uploadedAt: onDay(-1, 12, 2), by: "p3", syncState: "synced" },
  { id: "ph38", jobId: "j20", seed: "gr-24", kind: "site", caption: "Two air movers and the dehu, day three", capturedAt: onDay(0, 6, 40), by: "p1", syncState: "queued" },
  { id: "ph39", jobId: "j20", seed: "gr-26", kind: "crawl", caption: "Meter log board, bays 1 through 4", capturedAt: onDay(0, 6, 44), by: "p1", syncState: "failed" },

  /* ---- j21 punch list ---------------------------------------------- */
  { id: "ph40", jobId: "j21", seed: "gr-15", kind: "crawl", caption: "Barrier seam at the hatch, needs resealing", capturedAt: onDay(-1, 13, 10), uploadedAt: onDay(-1, 13, 30), by: "p3", syncState: "synced" },
  { id: "ph41", jobId: "j21", seed: "gr-25", kind: "site", caption: "Vent screen missing, east wall", capturedAt: onDay(-1, 13, 14), uploadedAt: onDay(-1, 13, 30), by: "p3", syncState: "synced" },
  { id: "ph42", jobId: "j21", seed: "gr-01", kind: "repair", caption: "Garage jamb, primer only so far", capturedAt: onDay(-1, 13, 19), uploadedAt: onDay(-1, 13, 31), by: "p3", syncState: "synced" },

  /* ---- j22 closed out ---------------------------------------------- */
  { id: "ph43", jobId: "j22", seed: "gr-03", kind: "repair", caption: "Finished subfloor, upstairs bath", capturedAt: onDay(-48, 14, 20), uploadedAt: onDay(-48, 16, 0), by: "p3", syncState: "synced" },
  { id: "ph44", jobId: "j22", seed: "gr-08", kind: "crawl", caption: "New barrier sealed at the stem wall", capturedAt: onDay(-48, 14, 26), uploadedAt: onDay(-48, 16, 0), by: "p3", syncState: "synced" },

  /* ---- customer-sent photos (attached to threads t1 and t5) -------- */
  { id: "ph45", jobId: "j1", seed: "gr-13", kind: "deck", caption: "Sent by Dana: boards by the slider, they flex when you step", capturedAt: onDay(-2, 19, 35), uploadedAt: onDay(-2, 19, 38), by: "c1", syncState: "synced" },
  { id: "ph46", jobId: "j20", seed: "gr-05", kind: "moisture", caption: "Sent by Wes: water at the baseboard again this morning", capturedAt: onDay(-1, 7, 20), uploadedAt: onDay(-1, 7, 22), by: "c10", syncState: "synced" },

  /* ---- sales-visit photos ------------------------------------------ */
  { id: "ph47", jobId: "j16", seed: "gr-20", kind: "site", caption: "Low corner where the sump goes", capturedAt: onDay(-27, 10, 15), uploadedAt: onDay(-27, 12, 0), by: "p2", syncState: "synced" },
  { id: "ph48", jobId: "j13", seed: "gr-19", kind: "crawl", caption: "Under the main bath, sent with the estimate", capturedAt: onDay(-16, 11, 5), uploadedAt: onDay(-16, 12, 30), by: "p2", syncState: "synced" },
];

/* =====================================================================
 * ESTIMATES — 7, one per job that has reached a pricing stage.
 *
 * Every line carries unitPriceCents and unitCostCents, so margin is a real
 * number and not a guess. e3 (the Arakawa envelope) prices at 21% because we
 * chased a three-bid job on price — the app should flag that, not hide it.
 * e3 is also the one estimate with optional upgrade lines.
 * ===================================================================== */

const estimates: Estimate[] = [
  /* ---- e1 · j10 · draft ------------------------------------------- */
  {
    id: "e1",
    jobId: "j10",
    number: "EST-1184",
    version: 1,
    status: "draft",
    depositPct: 30,
    createdAt: onDay(-2, 16, 10),
    note: "Downspout extensions are on Bryce — written into the note, not the price.",
    items: [
      { id: "e1i1", description: "Mobilization, crawl access and containment", qty: 1, unit: "ls", unitPriceCents: 95000, unitCostCents: 42000, taxable: false },
      { id: "e1i2", description: "Remove failed vapor barrier, wet insulation and debris", qty: 1400, unit: "sf", unitPriceCents: 145, unitCostCents: 62, taxable: true },
      { id: "e1i3", description: "Sister 2x10 PT floor joists with ZMAX hangers", internalNote: "84lf measured, priced 84. No slack in this one.", qty: 84, unit: "lf", unitPriceCents: 4200, unitCostCents: 2150, taxable: true },
      { id: "e1i4", description: "Replace rim joist, north and east runs", qty: 46, unit: "lf", unitPriceCents: 5400, unitCostCents: 2900, taxable: true },
      { id: "e1i5", description: "Replace 3/4in T and G subfloor sheathing", qty: 320, unit: "sf", unitPriceCents: 1150, unitCostCents: 560, taxable: true },
      { id: "e1i6", description: "New 10-mil vapor barrier, sealed and pinned", qty: 1400, unit: "sf", unitPriceCents: 185, unitCostCents: 78, taxable: true },
      { id: "e1i7", description: "Concrete pier blocks and PT posts at the girder", qty: 4, unit: "ea", unitPriceCents: 38000, unitCostCents: 17500, taxable: true },
      { id: "e1i8", description: "Carpentry labor, two-man crew", internalNote: "Six days at 16 crew-hours. Tight if the weather turns.", qty: 96, unit: "hr", unitPriceCents: 9500, unitCostCents: 5200, taxable: false },
      { id: "e1i9", description: "Debris haul-off and dump fees", qty: 1, unit: "ls", unitPriceCents: 68000, unitCostCents: 31000, taxable: false },
    ],
  },

  /* ---- e2 · j11 · draft, waiting on the permit -------------------- */
  {
    id: "e2",
    jobId: "j11",
    number: "EST-1179",
    version: 2,
    status: "draft",
    depositPct: 35,
    createdAt: onDay(-19, 15, 5),
    note: "Version 2 adds the engineering letter Everett asked for. Do not send until the permit clears review.",
    items: [
      { id: "e2i1", description: "Engineering letter and City of Everett permit", qty: 1, unit: "ls", unitPriceCents: 145000, unitCostCents: 95000, taxable: false },
      { id: "e2i2", description: "Temporary shoring of the kitchen bump-out", qty: 1, unit: "ls", unitPriceCents: 84000, unitCostCents: 38000, taxable: false },
      { id: "e2i3", description: "Replace PT sill plate, new anchor bolts and plate washers", qty: 22, unit: "lf", unitPriceCents: 7600, unitCostCents: 4100, taxable: true },
      { id: "e2i4", description: "Replace band board and rim, bump-out run", qty: 22, unit: "lf", unitPriceCents: 6200, unitCostCents: 3300, taxable: true },
      { id: "e2i5", description: "Subfloor patch at the bump-out", qty: 64, unit: "sf", unitPriceCents: 1250, unitCostCents: 620, taxable: true },
      { id: "e2i6", description: "Siding and trim repair, left paint-ready", internalNote: "1922 house, siding is 1x8 cedar. Milling a match adds a day.", qty: 1, unit: "ls", unitPriceCents: 178000, unitCostCents: 96000, taxable: true },
      { id: "e2i7", description: "Carpentry labor", qty: 58, unit: "hr", unitPriceCents: 9500, unitCostCents: 5200, taxable: false },
    ],
  },

  /* ---- e3 · j12 · sent · 21% margin, two optional upgrades -------- */
  {
    id: "e3",
    jobId: "j12",
    number: "EST-1152",
    version: 3,
    status: "sent",
    depositPct: 25,
    createdAt: onDay(-12, 9, 0),
    sentAt: onDay(-9, 16, 45),
    expiresAt: onDay(21, 17, 0),
    note: "Third version. We sharpened the pencil twice to stay in it. Do not discount again.",
    items: [
      { id: "e3i1", description: "Scaffold, protection and site setup", qty: 1, unit: "ls", unitPriceCents: 385000, unitCostCents: 301000, taxable: false },
      { id: "e3i2", description: "Remove existing siding, building paper and trim", qty: 3200, unit: "sf", unitPriceCents: 195, unitCostCents: 154, taxable: true },
      { id: "e3i3", description: "Replace rotted OSB sheathing where found", internalNote: "520sf is an allowance. Anything past it is a change order, in writing.", qty: 520, unit: "sf", unitPriceCents: 880, unitCostCents: 700, taxable: true },
      { id: "e3i4", description: "Self-adhered flashing at 14 windows and 2 doors", qty: 16, unit: "ea", unitPriceCents: 28500, unitCostCents: 22800, taxable: true },
      { id: "e3i5", description: "Weather barrier and rainscreen furring", qty: 3200, unit: "sf", unitPriceCents: 265, unitCostCents: 212, taxable: true },
      { id: "e3i6", description: "Fiber cement siding and trim, installed and caulked", internalNote: "Margin lives or dies here. Confirm the supplier hold before signing.", qty: 3200, unit: "sf", unitPriceCents: 930, unitCostCents: 730, taxable: true },
      { id: "e3i7", description: "Debris containers and disposal", qty: 1, unit: "ls", unitPriceCents: 152000, unitCostCents: 118000, taxable: false },
      { id: "e3i8", description: "Paint, two coats body and trim", qty: 3200, unit: "sf", unitPriceCents: 175, unitCostCents: 140, taxable: true },
      { id: "e3i9", description: "Upgrade: 30-year composite trim package", qty: 1, unit: "ls", unitPriceCents: 486000, unitCostCents: 352000, taxable: true, optional: true },
      { id: "e3i10", description: "Upgrade: replace gutters and downspouts", qty: 186, unit: "lf", unitPriceCents: 2400, unitCostCents: 1550, taxable: true, optional: true },
    ],
  },

  /* ---- e4 · j13 · sent, viewed six days ago, still no answer ------ */
  {
    id: "e4",
    jobId: "j13",
    number: "EST-1168",
    version: 1,
    status: "viewed",
    depositPct: 30,
    createdAt: onDay(-16, 11, 30),
    sentAt: onDay(-14, 9, 5),
    viewedAt: onDay(-6, 19, 22),
    expiresAt: onDay(16, 17, 0),
    note: "Karen has bought from us twice. She is not shopping it, she is busy.",
    items: [
      { id: "e4i1", description: "Mobilization and crawl containment", qty: 1, unit: "ls", unitPriceCents: 78000, unitCostCents: 34000, taxable: false },
      { id: "e4i2", description: "Remove wet insulation and old vapor barrier", qty: 620, unit: "sf", unitPriceCents: 155, unitCostCents: 66, taxable: true },
      { id: "e4i3", description: "Sister 2x8 PT joists below the bath", qty: 38, unit: "lf", unitPriceCents: 4050, unitCostCents: 2100, taxable: true },
      { id: "e4i4", description: "Replace subfloor under the tub and toilet flange", qty: 96, unit: "sf", unitPriceCents: 1280, unitCostCents: 610, taxable: true },
      { id: "e4i5", description: "Replace rim joist section, south wall", qty: 16, unit: "lf", unitPriceCents: 5400, unitCostCents: 2900, taxable: true },
      { id: "e4i6", description: "New 10-mil vapor barrier, sealed and pinned", qty: 620, unit: "sf", unitPriceCents: 190, unitCostCents: 80, taxable: true },
      { id: "e4i7", description: "Carpentry labor", qty: 58, unit: "hr", unitPriceCents: 9500, unitCostCents: 5200, taxable: false },
      { id: "e4i8", description: "Haul-off and dump fees", qty: 1, unit: "ls", unitPriceCents: 46000, unitCostCents: 21000, taxable: false },
    ],
  },

  /* ---- e5 · j14 · sent -------------------------------------------- */
  {
    id: "e5",
    jobId: "j14",
    number: "EST-1171",
    version: 1,
    status: "sent",
    depositPct: 30,
    createdAt: onDay(-15, 12, 0),
    sentAt: onDay(-13, 10, 20),
    expiresAt: onDay(17, 17, 0),
    note: "Tomas wants it primed, not finish painted. Painter is his nephew.",
    items: [
      { id: "e5i1", description: "Temporary shoring of the porch roof", qty: 1, unit: "ls", unitPriceCents: 64000, unitCostCents: 28000, taxable: false },
      { id: "e5i2", description: "Replace 6x6 PT posts on standoff bases", qty: 3, unit: "ea", unitPriceCents: 62000, unitCostCents: 33500, taxable: true },
      { id: "e5i3", description: "Replace porch beam, 4x10 PT", qty: 18, unit: "lf", unitPriceCents: 7800, unitCostCents: 4300, taxable: true },
      { id: "e5i4", description: "Replace rotted beam pocket trim and skirt", qty: 1, unit: "ls", unitPriceCents: 58000, unitCostCents: 31000, taxable: true },
      { id: "e5i5", description: "Carpentry labor", qty: 32, unit: "hr", unitPriceCents: 9500, unitCostCents: 5200, taxable: false },
      { id: "e5i6", description: "Prep and primer, paint-ready", qty: 1, unit: "ls", unitPriceCents: 42000, unitCostCents: 19000, taxable: true },
    ],
  },

  /* ---- e6 · j15 · approved, deposit still not collected ----------- */
  {
    id: "e6",
    jobId: "j15",
    number: "EST-1160",
    version: 2,
    status: "approved",
    depositPct: 30,
    createdAt: onDay(-24, 16, 0),
    sentAt: onDay(-21, 9, 30),
    viewedAt: onDay(-21, 20, 4),
    decidedAt: onDay(-3, 18, 45),
    decidedVia: "signature",
    expiresAt: onDay(9, 17, 0),
    note: "Signed on the phone from a hotel in Boise. Deposit card declined two days later.",
    items: [
      { id: "e6i1", description: "Mobilization, crawl access and containment", qty: 1, unit: "ls", unitPriceCents: 88000, unitCostCents: 39000, taxable: false },
      { id: "e6i2", description: "Remove failed vapor barrier and wet insulation", qty: 1180, unit: "sf", unitPriceCents: 150, unitCostCents: 64, taxable: true },
      { id: "e6i3", description: "Sister 2x10 PT floor joists with ZMAX hangers", qty: 96, unit: "lf", unitPriceCents: 4200, unitCostCents: 2150, taxable: true },
      { id: "e6i4", description: "Replace rim joist, west run", qty: 34, unit: "lf", unitPriceCents: 5400, unitCostCents: 2900, taxable: true },
      { id: "e6i5", description: "Replace subfloor sheathing under the laundry", qty: 140, unit: "sf", unitPriceCents: 1180, unitCostCents: 570, taxable: true },
      { id: "e6i6", description: "New 10-mil vapor barrier, sealed and pinned", qty: 1180, unit: "sf", unitPriceCents: 185, unitCostCents: 78, taxable: true },
      { id: "e6i7", description: "Two pier blocks and PT posts at the center girder", qty: 2, unit: "ea", unitPriceCents: 38000, unitCostCents: 17500, taxable: true },
      { id: "e6i8", description: "Carpentry labor, two-man crew", qty: 84, unit: "hr", unitPriceCents: 9500, unitCostCents: 5200, taxable: false },
      { id: "e6i9", description: "Haul-off and dump fees", qty: 1, unit: "ls", unitPriceCents: 62000, unitCostCents: 28000, taxable: false },
    ],
  },

  /* ---- e7 · j24 · declined, lost on price ------------------------- */
  {
    id: "e7",
    jobId: "j24",
    number: "EST-0994",
    version: 1,
    status: "declined",
    depositPct: 30,
    createdAt: onDay(-287, 13, 0),
    sentAt: onDay(-284, 10, 15),
    viewedAt: onDay(-284, 12, 40),
    decidedAt: onDay(-276, 17, 30),
    decidedVia: "email_reply",
    expiresAt: onDay(-254, 17, 0),
    note: "Lost by about 9k to a handyman with no flashing detail and no permit line. Vincent said price, plainly. No hard feelings, he came back for the sill plate.",
    items: [
      { id: "e7i1", description: "Demo existing deck and haul off", qty: 1, unit: "ls", unitPriceCents: 185000, unitCostCents: 96000, taxable: false },
      { id: "e7i2", description: "New PT framing, 2x8 joists at 16in on center", qty: 240, unit: "lf", unitPriceCents: 3800, unitCostCents: 2250, taxable: true },
      { id: "e7i3", description: "New 6x6 posts on concrete piers", qty: 6, unit: "ea", unitPriceCents: 46000, unitCostCents: 26000, taxable: true },
      { id: "e7i4", description: "Ledger, flashing and structural fasteners", internalNote: "The line the cheap bid did not have.", qty: 24, unit: "lf", unitPriceCents: 5800, unitCostCents: 3200, taxable: true },
      { id: "e7i5", description: "PT decking, hidden fasteners", qty: 420, unit: "sf", unitPriceCents: 1450, unitCostCents: 880, taxable: true },
      { id: "e7i6", description: "Guardrail and stairs to code", qty: 1, unit: "ls", unitPriceCents: 268000, unitCostCents: 158000, taxable: true },
      { id: "e7i7", description: "Carpentry labor", qty: 64, unit: "hr", unitPriceCents: 9500, unitCostCents: 5200, taxable: false },
    ],
  },
  /* --- the three jobs in production were sold from these; they are what the
     hours on site are measured against --- */
  {
    id: "e8", jobId: "j19", number: "EST-1143", version: 2, status: "approved",
    depositPct: 30, createdAt: onDay(-21, 16, 0), sentAt: onDay(-21, 17, 10),
    viewedAt: onDay(-21, 19, 40), decidedAt: onDay(-18, 9, 15), decidedVia: "signature",
    items: [
      { id: "li-e8-1", description: "Mobilization, protection and site setup", qty: 1, unit: "ls", unitPriceCents: 80600, unitCostCents: 42000, taxable: true },
      { id: "li-e8-2", description: "Demo the failed deck and haul off", qty: 1, unit: "ls", unitPriceCents: 210000, unitCostCents: 96000, taxable: true },
      { id: "li-e8-3", description: "New ledger, flashing and fasteners", qty: 22, unit: "lf", unitPriceCents: 18600, unitCostCents: 8900, taxable: true, internalNote: "Assumes the band board is sound behind the old ledger" },
      { id: "li-e8-4", description: "Replace deck joists", qty: 96, unit: "lf", unitPriceCents: 4800, unitCostCents: 2350, taxable: true },
      { id: "li-e8-5", description: "New decking and fascia", qty: 320, unit: "sf", unitPriceCents: 1450, unitCostCents: 780, taxable: true },
      { id: "li-e8-6", description: "Carpentry labor", qty: 58, unit: "hr", unitPriceCents: 6200, unitCostCents: 3900, taxable: false },
    ],
    note: "Price assumes the band board behind the ledger is sound. Anything found behind it is quoted as a change order before we continue.",
  },
  {
    id: "e9", jobId: "j20", number: "EST-1147", version: 1, status: "approved",
    depositPct: 30, createdAt: onDay(-17, 11, 0), sentAt: onDay(-17, 12, 0),
    viewedAt: onDay(-17, 13, 20), decidedAt: onDay(-15, 8, 40), decidedVia: "signature",
    items: [
      { id: "li-e9-1", description: "Mobilization and crawl containment", qty: 1, unit: "ls", unitPriceCents: 120000, unitCostCents: 58000, taxable: true },
      { id: "li-e9-2", description: "Demo wet material and dry the space", qty: 1, unit: "ls", unitPriceCents: 340000, unitCostCents: 150000, taxable: true },
      { id: "li-e9-3", description: "Replace subfloor", qty: 420, unit: "sf", unitPriceCents: 2150, unitCostCents: 1120, taxable: true },
      { id: "li-e9-4", description: "Sister and replace joists", qty: 140, unit: "lf", unitPriceCents: 5400, unitCostCents: 2600, taxable: true },
      { id: "li-e9-5", description: "Interior wall base repair", qty: 60, unit: "lf", unitPriceCents: 4900, unitCostCents: 2300, taxable: true },
      { id: "li-e9-6", description: "New 10-mil vapor barrier", qty: 620, unit: "sf", unitPriceCents: 1150, unitCostCents: 620, taxable: true },
      { id: "li-e9-7", description: "Carpentry labor", qty: 120, unit: "hr", unitPriceCents: 6200, unitCostCents: 3900, taxable: false },
      { id: "li-e9-8", description: "Dumpster and disposal", qty: 1, unit: "ls", unitPriceCents: 250000, unitCostCents: 140000, taxable: true },
    ],
  },
  {
    id: "e10", jobId: "j21", number: "EST-1131", version: 1, status: "approved",
    depositPct: 30, createdAt: onDay(-34, 10, 0), sentAt: onDay(-34, 11, 0),
    viewedAt: onDay(-34, 12, 10), decidedAt: onDay(-31, 16, 30), decidedVia: "signature",
    items: [
      { id: "li-e10-1", description: "Crawl space rot repair at the rim", qty: 60, unit: "lf", unitPriceCents: 9500, unitCostCents: 4700, taxable: true },
      { id: "li-e10-2", description: "Replace subfloor under the bath", qty: 180, unit: "sf", unitPriceCents: 2100, unitCostCents: 1100, taxable: true },
      { id: "li-e10-3", description: "New vapor barrier, sealed and pinned", qty: 420, unit: "sf", unitPriceCents: 1100, unitCostCents: 600, taxable: true },
      { id: "li-e10-4", description: "Carpentry labor", qty: 24, unit: "hr", unitPriceCents: 6200, unitCostCents: 3900, taxable: false },
      { id: "li-e10-5", description: "Punch list and touch-up", qty: 1, unit: "ls", unitPriceCents: 3200, unitCostCents: 1400, taxable: true },
    ],
  },
];

/* =====================================================================
 * CHANGE ORDERS — 3. Discovered damage, a customer upgrade, and one the
 * adjuster already signed off on.
 * ===================================================================== */

const changeOrders: ChangeOrder[] = [
  {
    id: "co1",
    jobId: "j18",
    number: "CO-1184-01",
    reason: "Girder splice found unsupported and a second run of soft joists in bay 9 once the insulation came down. Neither was visible at the inspection.",
    findingIds: ["f16", "f17"],
    status: "draft",
    scheduleImpactDays: 2,
    createdAt: onDay(-1, 16, 20),
    items: [
      { id: "co1i1", description: "Install PT post and pier under the west girder splice", qty: 1, unit: "ea", unitPriceCents: 68000, unitCostCents: 31000, taxable: true },
      { id: "co1i2", description: "Sister 2x10 joists, bay 9 run", qty: 26, unit: "lf", unitPriceCents: 4200, unitCostCents: 2150, taxable: true },
      { id: "co1i3", description: "Additional carpentry labor", qty: 14, unit: "hr", unitPriceCents: 9500, unitCostCents: 5200, taxable: false },
      { id: "co1i4", description: "Additional haul-off", qty: 1, unit: "ls", unitPriceCents: 18000, unitCostCents: 8000, taxable: false },
    ],
  },
  {
    id: "co2",
    jobId: "j19",
    number: "CO-1143-01",
    reason: "Customer asked to upgrade the decking to composite and rough in stair lighting while the framing is open.",
    findingIds: [],
    status: "sent",
    scheduleImpactDays: 1,
    createdAt: onDay(-3, 17, 10),
    sentAt: onDay(-2, 15, 40),
    items: [
      { id: "co2i1", description: "Upgrade decking to composite, installed", qty: 380, unit: "sf", unitPriceCents: 1980, unitCostCents: 1320, taxable: true },
      { id: "co2i2", description: "Stair and rail lighting rough-in", qty: 1, unit: "ls", unitPriceCents: 96000, unitCostCents: 52000, taxable: true },
      { id: "co2i3", description: "Additional carpentry labor for the upgrade", qty: 8, unit: "hr", unitPriceCents: 9500, unitCostCents: 5200, taxable: false },
    ],
  },
  {
    id: "co3",
    jobId: "j20",
    number: "CO-1139-02",
    reason: "PEMCO approved the additional 120sf of subfloor and the bay 3 joist run that fell outside the original adjuster scope.",
    findingIds: [],
    status: "approved",
    scheduleImpactDays: 2,
    createdAt: onDay(-2, 13, 20),
    sentAt: onDay(-2, 16, 0),
    decidedAt: onDay(-1, 14, 10),
    approvedVersion: 1,
    items: [
      { id: "co3i1", description: "Additional subfloor replacement outside original scope", qty: 120, unit: "sf", unitPriceCents: 1280, unitCostCents: 610, taxable: true },
      { id: "co3i2", description: "Additional joist sistering, bay 3", qty: 22, unit: "lf", unitPriceCents: 4200, unitCostCents: 2150, taxable: true },
      { id: "co3i3", description: "Extended drying equipment rental", qty: 4, unit: "day", unitPriceCents: 42000, unitCostCents: 24000, taxable: false },
      { id: "co3i4", description: "Additional carpentry labor", qty: 16, unit: "hr", unitPriceCents: 9500, unitCostCents: 5200, taxable: false },
    ],
  },
];

/* =====================================================================
 * APPOINTMENTS — 30, day -3 through day +9.
 *
 * Inspections run in the morning with travel time attached. Work blocks are
 * whole days. There is exactly one crew conflict in here on purpose: on day
 * +2 (Saturday catch-up) Tino is booked on ap16 and ap17 at the same time.
 * The schedule screen has to find it and say who is double-booked.
 * ===================================================================== */

const appointments: Appointment[] = [
  /* ---- day -3, Monday --------------------------------------------- */
  { id: "ap1", jobId: "j18", kind: "work", startAt: onDay(-3, 7, 30), endAt: onDay(-3, 16, 0), crewIds: ["p3", "p4"], state: "done", note: "Day one. Demo the north rim and bag the fallen insulation." },
  { id: "ap2", jobId: "j19", kind: "work", startAt: onDay(-3, 8, 0), endAt: onDay(-3, 15, 30), crewIds: ["p1"], state: "done", note: "Pull decking back to joist 8 and get eyes on the ledger." },

  /* ---- day -2, Tuesday -------------------------------------------- */
  { id: "ap3", jobId: "j18", kind: "work", startAt: onDay(-2, 7, 30), endAt: onDay(-2, 16, 0), crewIds: ["p3", "p4"], state: "done", note: "Rim in, start sistering bays 4 to 6." },
  { id: "ap4", jobId: "j19", kind: "work", startAt: onDay(-2, 8, 0), endAt: onDay(-2, 15, 30), crewIds: ["p1"], state: "done", note: "Ledger off. Band board is worse than the photos." },
  { id: "ap5", jobId: "j8", kind: "inspection", startAt: onDay(-2, 9, 0), endAt: onDay(-2, 10, 30), crewIds: ["p2"], state: "done", travelMinutes: 25, note: "Low clearance crawl, 22in. Bring the creeper." },

  /* ---- day -1, Wednesday ------------------------------------------ */
  { id: "ap6", jobId: "j18", kind: "work", startAt: onDay(-1, 7, 30), endAt: onDay(-1, 16, 0), crewIds: ["p3", "p4"], state: "done", note: "Insulation down in bays 7 to 10. Girder splice found." },
  { id: "ap7", jobId: "j20", kind: "work", startAt: onDay(-1, 8, 0), endAt: onDay(-1, 16, 30), crewIds: ["p1"], state: "done", note: "Cut the kitchen subfloor back, set drying equipment." },
  { id: "ap8", jobId: "j9", kind: "inspection", startAt: onDay(-1, 8, 30), endAt: onDay(-1, 9, 45), crewIds: ["p2"], state: "done", travelMinutes: 35, note: "Bring the 12ft ladder, deck is high at the far corner." },

  /* ---- day 0, today, Thursday ------------------------------------- */
  { id: "ap9", jobId: "j18", kind: "work", startAt: onDay(0, 7, 30), endAt: onDay(0, 16, 0), crewIds: ["p3", "p4"], state: "in_progress", note: "Subfloor under the bath goes in today if the plumber shows." },
  { id: "ap10", jobId: "j20", kind: "work", startAt: onDay(0, 8, 0), endAt: onDay(0, 16, 30), crewIds: ["p1"], state: "confirmed", note: "Bay 1 joists out, sister and sheet. Adjuster wants the moisture log by 5." },
  { id: "ap11", jobId: "j6", kind: "inspection", startAt: onDay(0, 10, 0), endAt: onDay(0, 11, 0), crewIds: ["p2"], state: "confirmed", travelMinutes: 20, note: "Baby naps 12 to 2 — be out before then. Meter and borescope." },

  /* ---- day +1, Friday --------------------------------------------- */
  { id: "ap12", jobId: "j18", kind: "work", startAt: onDay(1, 7, 30), endAt: onDay(1, 13, 0), crewIds: ["p3"], state: "confirmed", note: "Half day. Barrier goes down in the finished bays." },
  { id: "ap13", jobId: "j20", kind: "work", startAt: onDay(1, 8, 0), endAt: onDay(1, 16, 0), crewIds: ["p1", "p4"], state: "confirmed", note: "Hall bath open-up, per the approved change order." },
  { id: "ap14", jobId: "j7", kind: "inspection", startAt: onDay(1, 9, 30), endAt: onDay(1, 10, 30), crewIds: ["p2"], state: "confirmed", travelMinutes: 30, note: "Pull a deck board to see the flashing. Dogs are inside." },
  { id: "ap15", jobId: "j21", kind: "punch", startAt: onDay(1, 14, 0), endAt: onDay(1, 16, 0), crewIds: ["p3"], state: "confirmed", note: "Three items: hatch seam, vent screen, garage jamb topcoat." },

  /* ---- day +2, Saturday catch-up — CONFLICT on Tino --------------- */
  { id: "ap16", jobId: "j20", kind: "work", startAt: onDay(2, 8, 0), endAt: onDay(2, 16, 0), crewIds: ["p1", "p3"], state: "confirmed", note: "Saturday catch-up to hold the adjuster deadline." },
  { id: "ap17", jobId: "j18", kind: "work", startAt: onDay(2, 7, 30), endAt: onDay(2, 14, 0), crewIds: ["p3", "p4"], state: "confirmed", note: "Finish the barrier and close out. Booked before the j20 Saturday was added." },

  /* ---- day +4, Monday --------------------------------------------- */
  { id: "ap18", jobId: "j19", kind: "delivery", startAt: onDay(4, 7, 0), endAt: onDay(4, 7, 45), crewIds: ["p5"], state: "confirmed", note: "Glulam beam, hangers and the composite decking. Dunn Lumber will-call, curbside." },
  { id: "ap19", jobId: "j19", kind: "work", startAt: onDay(4, 8, 0), endAt: onDay(4, 15, 30), crewIds: ["p1", "p4"], state: "confirmed", note: "Beam in, band board and sheathing replaced same day." },
  { id: "ap20", jobId: "j16", kind: "work", startAt: onDay(4, 7, 30), endAt: onDay(4, 16, 0), crewIds: ["p3"], state: "confirmed", note: "Start: strip the old barrier, lay out the sump." },
  { id: "ap21", jobId: "j18", kind: "walkthrough", startAt: onDay(4, 16, 15), endAt: onDay(4, 17, 0), crewIds: ["p1"], state: "confirmed", note: "Walk the crawl with Hollis, photos on the tablet, sign the completion sheet." },

  /* ---- day +5, Tuesday -------------------------------------------- */
  { id: "ap22", jobId: "j16", kind: "work", startAt: onDay(5, 7, 30), endAt: onDay(5, 16, 0), crewIds: ["p3", "p4"], state: "confirmed", note: "Sump set and discharge trenched." },
  { id: "ap23", jobId: "j19", kind: "work", startAt: onDay(5, 8, 0), endAt: onDay(5, 15, 30), crewIds: ["p1"], state: "confirmed", note: "Joists and blocking." },

  /* ---- day +6, Wednesday ------------------------------------------ */
  { id: "ap24", jobId: "j16", kind: "work", startAt: onDay(6, 7, 30), endAt: onDay(6, 16, 0), crewIds: ["p3", "p4"], state: "confirmed", note: "New 10-mil, sealed and pinned." },
  { id: "ap25", jobId: "j17", kind: "work", startAt: onDay(6, 8, 0), endAt: onDay(6, 15, 0), crewIds: ["p1"], state: "tentative", note: "Landing demo. Tentative — weather call Tuesday night." },

  /* ---- day +7, Thursday ------------------------------------------- */
  { id: "ap26", jobId: "j17", kind: "work", startAt: onDay(7, 8, 0), endAt: onDay(7, 15, 0), crewIds: ["p1", "p4"], state: "tentative", note: "Stringers and treads." },
  { id: "ap27", jobId: "j16", kind: "work", startAt: onDay(7, 7, 30), endAt: onDay(7, 16, 0), crewIds: ["p3"], state: "confirmed", note: "Punch and photos." },

  /* ---- day +8, Friday --------------------------------------------- */
  { id: "ap28", jobId: "j17", kind: "work", startAt: onDay(8, 8, 0), endAt: onDay(8, 15, 0), crewIds: ["p1", "p4"], state: "tentative", note: "Rail and final." },
  { id: "ap29", jobId: "j15", kind: "work", startAt: onDay(8, 7, 30), endAt: onDay(8, 16, 0), crewIds: ["p3"], state: "tentative", note: "Pencilled start. Does not go firm until the deposit clears." },

  /* ---- day +9, Saturday ------------------------------------------- */
  { id: "ap30", jobId: "j23", kind: "walkthrough", startAt: onDay(9, 9, 0), endAt: onDay(9, 10, 0), crewIds: ["p3"], state: "confirmed", travelMinutes: 20, note: "Warranty look at the ledger. Pull the cap flashing, photograph, reseal if it is on us." },
];

/* =====================================================================
 * INVOICES — 9. Every job whose payment state is not "none" has one.
 * in7 is the 14-days-overdue 6,400 on the punch list job.
 * ===================================================================== */

const invoices: Invoice[] = [
  { id: "in1", jobId: "j15", number: "INV-2291", kind: "deposit", amountCents: 651390, issuedAt: onDay(-3, 10, 0), dueAt: onDay(1, 17, 0), paidCents: 0, state: "sent" },
  { id: "in2", jobId: "j16", number: "INV-2274", kind: "deposit", amountCents: 522780, issuedAt: onDay(-9, 9, 0), dueAt: onDay(-2, 17, 0), paidCents: 522780, state: "paid" },
  { id: "in3", jobId: "j17", number: "INV-2268", kind: "deposit", amountCents: 335520, issuedAt: onDay(-11, 9, 0), dueAt: onDay(-4, 17, 0), paidCents: 335520, state: "paid" },
  { id: "in4", jobId: "j18", number: "INV-2249", kind: "deposit", amountCents: 798540, issuedAt: onDay(-16, 9, 0), dueAt: onDay(-9, 17, 0), paidCents: 798540, state: "paid" },
  { id: "in5", jobId: "j19", number: "INV-2282", kind: "progress", amountCents: 1240000, issuedAt: onDay(-5, 9, 0), dueAt: onDay(2, 17, 0), paidCents: 600000, state: "partial" },
  { id: "in6", jobId: "j20", number: "INV-2256", kind: "deposit", amountCents: 1236000, issuedAt: onDay(-13, 9, 0), dueAt: onDay(-6, 17, 0), paidCents: 1236000, state: "paid" },
  { id: "in7", jobId: "j21", number: "INV-2218", kind: "progress", amountCents: 640000, issuedAt: onDay(-24, 9, 0), dueAt: onDay(-14, 17, 0), paidCents: 0, state: "overdue" },
  { id: "in8", jobId: "j22", number: "INV-2180", kind: "final", amountCents: 2384500, issuedAt: onDay(-47, 9, 0), dueAt: onDay(-33, 17, 0), paidCents: 2384500, state: "paid" },
  { id: "in9", jobId: "j23", number: "INV-2094", kind: "final", amountCents: 1291000, issuedAt: onDay(-152, 9, 0), dueAt: onDay(-138, 17, 0), paidCents: 1291000, state: "paid" },
];

/* =====================================================================
 * PAYMENTS — 11. One card is still pending and one was declined outright.
 * The declined one (pay7) is why j15 is sitting at awaiting_deposit.
 * ===================================================================== */

const payments: Payment[] = [
  { id: "pay1", invoiceId: "in2", jobId: "j16", amountCents: 522780, method: "card", at: onDay(-8, 11, 20), reference: "ch_7QK2R84M", feeCents: 15191, state: "settled" },
  { id: "pay2", invoiceId: "in3", jobId: "j17", amountCents: 335520, method: "ach", at: onDay(-10, 8, 5), reference: "ACH batch 0906-02", feeCents: 300, state: "settled" },
  { id: "pay3", invoiceId: "in4", jobId: "j18", amountCents: 798540, method: "check", at: onDay(-14, 15, 40), reference: "Check 2841, Coastal Community", feeCents: 0, state: "settled" },
  { id: "pay4", invoiceId: "in5", jobId: "j19", amountCents: 600000, method: "check", at: onDay(-4, 16, 10), reference: "Check 1173, BECU", feeCents: 0, state: "settled" },
  { id: "pay5", invoiceId: "in5", jobId: "j19", amountCents: 640000, method: "card", at: at({ m: -35 }), reference: "ch_9TF4L20B", feeCents: 18590, state: "pending" },
  { id: "pay6", invoiceId: "in6", jobId: "j20", amountCents: 1236000, method: "card", at: onDay(-12, 10, 45), reference: "ch_5HD8W31C", feeCents: 35874, state: "settled" },
  { id: "pay7", invoiceId: "in1", jobId: "j15", amountCents: 651390, method: "card", at: onDay(-2, 11, 6), reference: "Declined, do not honor. Card ending 4417", feeCents: 0, state: "failed" },
  { id: "pay8", invoiceId: "in8", jobId: "j22", amountCents: 1700000, method: "ach", at: onDay(-40, 9, 15), reference: "ACH batch 0808-01", feeCents: 300, state: "settled" },
  { id: "pay9", invoiceId: "in8", jobId: "j22", amountCents: 684500, method: "check", at: onDay(-35, 14, 0), reference: "Check 4402, Chase", feeCents: 0, state: "settled" },
  { id: "pay10", invoiceId: "in9", jobId: "j23", amountCents: 500000, method: "card", at: onDay(-149, 12, 0), reference: "ch_2MB6X77A", feeCents: 14530, state: "settled" },
  { id: "pay11", invoiceId: "in9", jobId: "j23", amountCents: 791000, method: "check", at: onDay(-141, 10, 30), reference: "Check 3319, Coastal Community", feeCents: 0, state: "settled" },
];

/* =====================================================================
 * THREADS — 9. Three need a reply (t1, t2, t4). t6 is an inbound call with
 * the ask pulled out of it. t1 and t5 carry photos the customer sent us.
 * ===================================================================== */

const threads: Thread[] = [
  { id: "t1", customerId: "c1", jobId: "j1", channel: "sms", unread: 1, lastAt: onDay(0, 6, 58), needsReply: true },
  { id: "t2", customerId: "c11", jobId: "j13", channel: "sms", unread: 1, lastAt: onDay(-6, 19, 25), needsReply: true },
  { id: "t3", customerId: "c7", jobId: "j19", channel: "sms", unread: 0, lastAt: onDay(-1, 14, 40), needsReply: false },
  { id: "t4", customerId: "c3", jobId: "j18", channel: "sms", unread: 2, lastAt: onDay(0, 6, 34), needsReply: true },
  { id: "t5", customerId: "c10", jobId: "j20", channel: "sms", unread: 0, lastAt: onDay(-1, 14, 28), needsReply: false },
  { id: "t6", customerId: "c12", jobId: "j15", channel: "call", unread: 0, lastAt: onDay(0, 6, 50), needsReply: false },
  { id: "t7", customerId: "c14", jobId: "j12", channel: "email", unread: 0, lastAt: onDay(-2, 9, 0), needsReply: false },
  { id: "t8", customerId: "c13", jobId: "j6", channel: "sms", unread: 1, lastAt: onDay(0, 6, 20), needsReply: false },
  { id: "t9", customerId: "c8", jobId: "j17", channel: "sms", unread: 0, lastAt: onDay(-1, 8, 5), needsReply: false },
];

/* =====================================================================
 * MESSAGES — 41. Homeowners write the way homeowners write.
 * ===================================================================== */

const messages: Message[] = [
  /* ---- t1 · Dana Whitcomb, deck boards ---------------------------- */
  { id: "m1", threadId: "t1", direction: "in", channel: "sms", at: onDay(-2, 19, 35), body: "Hi Marcus, a couple of the deck boards right outside the slider are getting spongy. Photo attached. Is that something you all do or is that a deck guy?", attachmentPhotoIds: ["ph45"], readAt: onDay(-2, 19, 52) },
  { id: "m2", threadId: "t1", direction: "out", channel: "sms", at: onDay(-2, 20, 10), body: "That is us. If the boards are soft the framing under them usually is too. I will call you and we can look at it while Tino is there for the punch list.", readAt: onDay(-2, 20, 18) },
  { id: "m3", threadId: "t1", direction: "in", channel: "sms", at: onDay(-1, 7, 50), body: "Sounds good. Also the crawl space invoice came through twice in my email, is that right?", readAt: onDay(-1, 8, 30) },
  { id: "m4", threadId: "t1", direction: "in", channel: "sms", at: onDay(0, 6, 58), body: "Morning. Did you still want to come by about the deck boards?" },

  /* ---- t2 · Karen Sundstrom, estimate sitting ---------------------- */
  { id: "m5", threadId: "t2", direction: "out", channel: "sms", at: onDay(-14, 9, 7), body: "Karen, the estimate for the crawl space under the main bath is in your email. Photos from the inspection are attached to it.", readAt: onDay(-14, 11, 50) },
  { id: "m6", threadId: "t2", direction: "in", channel: "sms", at: onDay(-14, 12, 2), body: "Got it, thank you. Reading it this weekend.", readAt: onDay(-14, 12, 30) },
  { id: "m7", threadId: "t2", direction: "out", channel: "sms", at: onDay(-8, 10, 0), body: "No rush at all, just making sure it landed and did not go to spam.", readAt: onDay(-8, 13, 12) },
  { id: "m8", threadId: "t2", direction: "in", channel: "sms", at: onDay(-6, 19, 25), body: "Opened it tonight. One question about the subfloor line, I will call you." },

  /* ---- t3 · Aimee Duclos, deck rebuild ----------------------------- */
  { id: "m9", threadId: "t3", direction: "in", channel: "sms", at: onDay(-2, 16, 40), body: "Is the wall supposed to be open like that? It rained last night.", readAt: onDay(-2, 16, 46) },
  { id: "m10", threadId: "t3", direction: "out", channel: "sms", at: onDay(-2, 16, 52), body: "It is wrapped and taped, nothing is getting in. The band board behind the ledger was rotted the full 11ft, so it had to come open. The change order for the composite decking is in your email too.", readAt: onDay(-2, 16, 58) },
  { id: "m11", threadId: "t3", direction: "in", channel: "sms", at: onDay(-2, 17, 5), body: "Okay. Yes to the composite, I will sign it tonight.", readAt: onDay(-2, 17, 20) },
  { id: "m12", threadId: "t3", direction: "out", channel: "sms", at: onDay(-1, 14, 15), body: "Beam is on will-call for Monday 7am. We will be quiet until then, there is nothing we can safely frame without it.", readAt: onDay(-1, 14, 33) },
  { id: "m13", threadId: "t3", direction: "in", channel: "sms", at: onDay(-1, 14, 40), body: "No problem. Thanks for telling me instead of just not showing up.", readAt: onDay(-1, 15, 0) },

  /* ---- t4 · Hollis Brandt, the crawl hatch ------------------------- */
  { id: "m14", threadId: "t4", direction: "out", channel: "sms", at: onDay(-3, 7, 45), body: "Tino and Jesse are at 2711 this morning. Starting on the north rim.", readAt: onDay(-3, 8, 1) },
  { id: "m15", threadId: "t4", direction: "in", channel: "sms", at: onDay(-2, 18, 20), body: "Tenant says there is a plumber needed for the tub drain?", readAt: onDay(-2, 18, 30) },
  { id: "m16", threadId: "t4", direction: "out", channel: "sms", at: onDay(-2, 18, 35), body: "Yes. The slip joint under the tub is dripping and it is what wet the subfloor. We cannot sheet over a live leak. Your plumber or ours, either is fine, but it has to happen before Friday or we lose the week.", readAt: onDay(-2, 19, 4) },
  { id: "m17", threadId: "t4", direction: "in", channel: "sms", at: onDay(0, 6, 32), body: "Hey, the guys left the crawl hatch open last night, is that ok? Tenant saw a raccoon on the porch." },
  { id: "m18", threadId: "t4", direction: "in", channel: "sms", at: onDay(0, 6, 34), body: "Also did the plumber get scheduled" },

  /* ---- t5 · Wes Trimble, insurance job ----------------------------- */
  { id: "m19", threadId: "t5", direction: "in", channel: "sms", at: onDay(-1, 7, 20), body: "Water showing at the baseboard again this morning, north wall by the fridge.", attachmentPhotoIds: ["ph46"], readAt: onDay(-1, 7, 38) },
  { id: "m20", threadId: "t5", direction: "out", channel: "sms", at: onDay(-1, 7, 44), body: "That helps, thank you. We found a second source this morning behind the hall vanity, the angle stop is weeping. Photographing it for Renae now.", readAt: onDay(-1, 8, 2) },
  { id: "m21", threadId: "t5", direction: "in", channel: "sms", at: onDay(-1, 9, 10), body: "Is that covered or is that on me", readAt: onDay(-1, 9, 20) },
  { id: "m22", threadId: "t5", direction: "out", channel: "sms", at: onDay(-1, 14, 20), body: "Renae approved it at 2:10 this afternoon. It goes on the claim as CO-1139-02. Nothing extra out of your pocket past the deductible you already paid.", readAt: onDay(-1, 14, 25) },
  { id: "m23", threadId: "t5", direction: "in", channel: "sms", at: onDay(-1, 14, 28), body: "Good. Thank you.", readAt: onDay(-1, 14, 40) },

  /* ---- t6 · Jamal Whitaker, inbound call --------------------------- */
  {
    id: "m24",
    threadId: "t6",
    direction: "in",
    channel: "call",
    at: onDay(-1, 18, 12),
    body: "Inbound call, 3m34s. Picked up by Bea.",
    callSeconds: 214,
    callSummary: "Wants to move Thursday's start to Friday, will pay the deposit today. Says the card on file was frozen by his bank while he was travelling and he has a different one.",
    readAt: onDay(-1, 18, 30),
  },
  { id: "m25", threadId: "t6", direction: "out", channel: "sms", at: onDay(-1, 18, 40), body: "Jamal, per the call: start moves to Friday the 25th. New payment link for the deposit is on its way to your email.", readAt: onDay(-1, 18, 55) },
  { id: "m26", threadId: "t6", direction: "in", channel: "sms", at: onDay(-1, 19, 2), body: "Perfect, paying tonight.", readAt: onDay(-1, 19, 10) },
  { id: "m27", threadId: "t6", direction: "out", channel: "sms", at: onDay(0, 6, 50), body: "Link is still open and nothing has come through. Anything giving you trouble on it?" },

  /* ---- t7 · Ted Arakawa, the envelope bid -------------------------- */
  { id: "m28", threadId: "t7", direction: "out", channel: "email", at: onDay(-9, 16, 50), body: "Ted, version 3 of the envelope estimate is attached. The composite trim and the gutters are priced as separate options so you can decide on those later without reopening the whole bid.", readAt: onDay(-9, 18, 20) },
  { id: "m29", threadId: "t7", direction: "in", channel: "email", at: onDay(-8, 8, 30), body: "Received. The other two bids came in at 58k and 71k. Yours is the only one that itemizes the window flashing, which I noticed.", readAt: onDay(-8, 8, 55) },
  { id: "m30", threadId: "t7", direction: "out", channel: "email", at: onDay(-8, 9, 15), body: "That is the part that fails, so it is the part we write down. The 58k bid is either not flashing the openings or it is an allowance that becomes a change order in month two. Happy to walk all three line by line with you, no obligation.", readAt: onDay(-8, 10, 40) },
  { id: "m31", threadId: "t7", direction: "in", channel: "email", at: onDay(-5, 17, 0), body: "HOA meets Monday about the scaffold permit. I will decide after that.", readAt: onDay(-5, 17, 30) },
  { id: "m32", threadId: "t7", direction: "out", channel: "email", at: onDay(-2, 9, 0), body: "Understood. One thing to know: our supplier hold on the fiber cement runs out on the 30th. After that the siding line moves and I would rather tell you now than surprise you.", readAt: onDay(-2, 11, 15) },

  /* ---- t8 · Lauren Mikkelsen, today's inspection ------------------- */
  { id: "m33", threadId: "t8", direction: "out", channel: "sms", at: onDay(-5, 11, 30), body: "Lauren, you are on for Thursday at 10. Dre will be about an hour, most of it under the house.", readAt: onDay(-5, 11, 38) },
  { id: "m34", threadId: "t8", direction: "in", channel: "sms", at: onDay(-5, 11, 41), body: "Thank you. Just so you know the baby naps 12 to 2, so nothing loud in that window.", readAt: onDay(-5, 12, 0) },
  { id: "m35", threadId: "t8", direction: "out", channel: "sms", at: onDay(-1, 16, 0), body: "Confirming tomorrow at 10. Dre drives a white F-250 with the Got Rot wrap on the side.", readAt: onDay(-1, 16, 12) },
  { id: "m36", threadId: "t8", direction: "in", channel: "sms", at: onDay(0, 6, 20), body: "See you then." },

  /* ---- t9 · Bryce Halvorsen, weather on the deck ------------------- */
  { id: "m37", threadId: "t9", direction: "out", channel: "sms", at: onDay(-2, 15, 0), body: "Bryce, the deck landing is on the calendar for Wednesday the 23rd.", readAt: onDay(-2, 15, 10) },
  { id: "m38", threadId: "t9", direction: "in", channel: "sms", at: onDay(-2, 15, 20), body: "Forecast looks bad Tuesday into Wednesday.", readAt: onDay(-2, 15, 44) },
  { id: "m39", threadId: "t9", direction: "out", channel: "sms", at: onDay(-1, 7, 45), body: "Agreed, we are watching it. If it is coming down Wednesday morning we push to Thursday, no charge either way. I will call you Tuesday night with the call.", readAt: onDay(-1, 7, 52) },
  { id: "m40", threadId: "t9", direction: "in", channel: "sms", at: onDay(-1, 7, 58), body: "That works. The crawl space estimate, are you still sending that this week?", readAt: onDay(-1, 8, 2) },
  { id: "m41", threadId: "t9", direction: "out", channel: "sms", at: onDay(-1, 8, 5), body: "Friday.", readAt: onDay(-1, 8, 20) },
];

/* =====================================================================
 * ACTIVITY — 76 entries, weighted to the busiest jobs. This is the audit
 * trail the Activity tab renders: who did what, when, and what the system
 * or the customer did on their own.
 * ===================================================================== */

const activity: Activity[] = [
  /* ---- j18 · Brandt rental crawl ---------------------------------- */
  { id: "act1", jobId: "j18", at: onDay(-33, 10, 15), actorId: "p2", kind: "stage", text: "Lead created from Hollis Brandt, repeat customer", meta: "repeat" },
  { id: "act2", jobId: "j18", at: onDay(-28, 11, 40), actorId: "p2", kind: "stage", text: "Inspection done, 8 findings logged" },
  { id: "act3", jobId: "j18", at: onDay(-22, 16, 5), actorId: "p2", kind: "estimate", text: "Estimate sent, 26,618.00" },
  { id: "act4", jobId: "j18", at: onDay(-18, 9, 20), actorId: "customer", kind: "estimate", text: "Hollis approved the estimate by signature" },
  { id: "act5", jobId: "j18", at: onDay(-16, 9, 0), actorId: "system", kind: "payment", text: "Deposit invoice INV-2249 issued, 7,985.40" },
  { id: "act6", jobId: "j18", at: onDay(-14, 15, 40), actorId: "p5", kind: "payment", text: "Deposit paid by check 2841" },
  { id: "act7", jobId: "j18", at: onDay(-12, 10, 0), actorId: "p5", kind: "schedule", text: "Six-day block confirmed with the tenant through Hollis" },
  { id: "act8", jobId: "j18", at: onDay(-3, 7, 32), actorId: "p3", kind: "stage", text: "Work started, day one" },
  { id: "act9", jobId: "j18", at: onDay(-3, 8, 14), actorId: "p3", kind: "finding", text: "Bay 4 rim joist soft to 14in from the north corner", meta: "structural" },
  { id: "act10", jobId: "j18", at: onDay(-3, 12, 41), actorId: "p4", kind: "photo", text: "4 photos uploaded" },
  { id: "act11", jobId: "j18", at: onDay(-2, 10, 42), actorId: "p3", kind: "finding", text: "Subfloor delaminated under the tub, live drip at the slip joint", meta: "structural" },
  { id: "act12", jobId: "j18", at: onDay(-2, 18, 35), actorId: "p1", kind: "message", text: "Told Hollis the plumber has to hit the tub drain before Friday" },
  { id: "act13", jobId: "j18", at: onDay(-1, 13, 25), actorId: "p3", kind: "finding", text: "Girder splice found unsupported, not in the original scope", meta: "new damage" },
  { id: "act14", jobId: "j18", at: onDay(-1, 16, 20), actorId: "p1", kind: "change_order", text: "Change order CO-1184-01 drafted, 2 findings attached, 2 days impact" },
  { id: "act15", jobId: "j18", at: onDay(0, 7, 6), actorId: "p3", kind: "finding", text: "Standing water in the center low spot after last night's rain", meta: "new damage" },
  { id: "act16", jobId: "j18", at: onDay(0, 6, 34), actorId: "customer", kind: "message", text: "Hollis asked about the crawl hatch being left open overnight" },

  /* ---- j19 · Duclos deck ------------------------------------------ */
  { id: "act17", jobId: "j19", at: onDay(-41, 12, 30), actorId: "p2", kind: "stage", text: "Lead created from Google, deck framing" },
  { id: "act18", jobId: "j19", at: onDay(-34, 10, 0), actorId: "p2", kind: "estimate", text: "Estimate sent, 19,842.00" },
  { id: "act19", jobId: "j19", at: onDay(-29, 13, 15), actorId: "customer", kind: "estimate", text: "Aimee approved the estimate by signature" },
  { id: "act20", jobId: "j19", at: onDay(-3, 8, 2), actorId: "p1", kind: "stage", text: "Work started" },
  { id: "act21", jobId: "j19", at: onDay(-3, 8, 30), actorId: "p1", kind: "finding", text: "Ledger lagged through lap siding, no flashing on the full run", meta: "structural" },
  { id: "act22", jobId: "j19", at: onDay(-3, 11, 1), actorId: "p1", kind: "photo", text: "3 photos uploaded" },
  { id: "act23", jobId: "j19", at: onDay(-2, 11, 20), actorId: "p1", kind: "finding", text: "Band board rotted 11ft behind the ledger", meta: "new damage" },
  { id: "act24", jobId: "j19", at: onDay(-2, 15, 40), actorId: "p1", kind: "change_order", text: "Change order CO-1143-01 sent: composite decking upgrade and stair lighting" },
  { id: "act25", jobId: "j19", at: onDay(-2, 17, 5), actorId: "customer", kind: "message", text: "Aimee said yes to the composite in writing" },
  { id: "act26", jobId: "j19", at: onDay(-1, 9, 15), actorId: "p1", kind: "finding", text: "Sheathing soft 8ft of the 11ft run, studs behind read 15", meta: "new damage" },
  { id: "act27", jobId: "j19", at: onDay(-1, 14, 10), actorId: "p5", kind: "note", text: "Framing paused: glulam beam and hangers moved to Monday will-call" },
  { id: "act28", jobId: "j19", at: at({ m: -35 }), actorId: "system", kind: "payment", text: "Card payment 6,400.00 submitted, pending settlement" },

  /* ---- j20 · Trimble insurance job -------------------------------- */
  { id: "act29", jobId: "j20", at: onDay(-31, 12, 5), actorId: "p2", kind: "stage", text: "Claim referral from PEMCO, adjuster Renae Coburn" },
  { id: "act30", jobId: "j20", at: onDay(-27, 9, 40), actorId: "p2", kind: "stage", text: "Inspection done with the adjuster on site" },
  { id: "act31", jobId: "j20", at: onDay(-22, 15, 20), actorId: "p1", kind: "estimate", text: "Scope of repair submitted to the carrier, 41,200.00" },
  { id: "act32", jobId: "j20", at: onDay(-15, 11, 0), actorId: "customer", kind: "estimate", text: "Carrier approved the scope of repair" },
  { id: "act33", jobId: "j20", at: onDay(-13, 9, 0), actorId: "system", kind: "payment", text: "Deposit invoice INV-2256 issued, 12,360.00" },
  { id: "act34", jobId: "j20", at: onDay(-12, 10, 45), actorId: "system", kind: "payment", text: "Deposit paid by card, settled" },
  { id: "act35", jobId: "j20", at: onDay(-1, 8, 5), actorId: "p1", kind: "stage", text: "Work started, front unit only" },
  { id: "act36", jobId: "j20", at: onDay(-1, 8, 30), actorId: "p5", kind: "note", text: "Back unit tenant has not unlocked, north crawl bay logged as uninspected" },
  { id: "act37", jobId: "j20", at: onDay(-1, 8, 47), actorId: "p1", kind: "finding", text: "Kitchen subfloor swollen and delaminated, 20sf", meta: "structural" },
  { id: "act38", jobId: "j20", at: onDay(-1, 12, 2), actorId: "p3", kind: "photo", text: "5 photos uploaded" },
  { id: "act39", jobId: "j20", at: onDay(-1, 14, 10), actorId: "customer", kind: "change_order", text: "Renae approved CO-1139-02, second water source added to the claim" },
  { id: "act40", jobId: "j20", at: onDay(0, 6, 50), actorId: "p1", kind: "finding", text: "Second source: angle stop weeping behind the hall vanity", meta: "new damage" },
  { id: "act41", jobId: "j20", at: onDay(0, 6, 52), actorId: "system", kind: "photo", text: "3 photos queued, no signal in the crawl space" },
  { id: "act42", jobId: "j20", at: onDay(0, 6, 44), actorId: "system", kind: "photo", text: "1 photo failed to upload, retry pending" },

  /* ---- j15 · Whitaker, approved, deposit stuck --------------------- */
  { id: "act43", jobId: "j15", at: onDay(-24, 15, 20), actorId: "p2", kind: "stage", text: "Referral from Bryce Halvorsen" },
  { id: "act44", jobId: "j15", at: onDay(-21, 9, 30), actorId: "p2", kind: "estimate", text: "Estimate EST-1160 v2 sent, 21,713.00" },
  { id: "act45", jobId: "j15", at: onDay(-21, 20, 4), actorId: "customer", kind: "estimate", text: "Jamal viewed the estimate" },
  { id: "act46", jobId: "j15", at: onDay(-3, 18, 45), actorId: "customer", kind: "estimate", text: "Approved by signature from a hotel in Boise" },
  { id: "act47", jobId: "j15", at: onDay(-3, 10, 0), actorId: "system", kind: "payment", text: "Deposit invoice INV-2291 issued, 6,513.90" },
  { id: "act48", jobId: "j15", at: onDay(-2, 11, 6), actorId: "system", kind: "payment", text: "Card declined, do not honor. Card ending 4417" },
  { id: "act49", jobId: "j15", at: onDay(-1, 18, 12), actorId: "p5", kind: "message", text: "Inbound call: move the start to Friday, will pay the deposit tonight" },
  { id: "act50", jobId: "j15", at: onDay(-1, 18, 42), actorId: "p5", kind: "schedule", text: "Start pencilled for Friday the 25th, stays tentative until the deposit clears" },

  /* ---- j13 · Sundstrom, estimate opened and gone quiet ------------- */
  { id: "act51", jobId: "j13", at: onDay(-16, 10, 40), actorId: "p2", kind: "stage", text: "Repeat customer, third job with us" },
  { id: "act52", jobId: "j13", at: onDay(-16, 11, 5), actorId: "p2", kind: "photo", text: "1 photo uploaded from the crawl under the main bath" },
  { id: "act53", jobId: "j13", at: onDay(-14, 9, 5), actorId: "p2", kind: "estimate", text: "Estimate EST-1168 sent, 12,520.80" },
  { id: "act54", jobId: "j13", at: onDay(-8, 10, 0), actorId: "p2", kind: "message", text: "Soft check-in text sent" },
  { id: "act55", jobId: "j13", at: onDay(-6, 19, 22), actorId: "customer", kind: "estimate", text: "Karen opened the estimate" },
  { id: "act56", jobId: "j13", at: onDay(-6, 19, 25), actorId: "customer", kind: "message", text: "Said she has a question about the subfloor line and will call" },
  { id: "act57", jobId: "j13", at: onDay(-1, 16, 0), actorId: "system", kind: "note", text: "Follow-up went overdue, no contact in 6 days" },

  /* ---- j21 · Whitcomb punch list ----------------------------------- */
  { id: "act58", jobId: "j21", at: onDay(-30, 16, 0), actorId: "p3", kind: "stage", text: "Crawl space scope finished, moved to punch list" },
  { id: "act59", jobId: "j21", at: onDay(-24, 9, 0), actorId: "system", kind: "payment", text: "Progress invoice INV-2218 issued, 6,400.00" },
  { id: "act60", jobId: "j21", at: onDay(-14, 17, 0), actorId: "system", kind: "payment", text: "Invoice INV-2218 past due" },
  { id: "act61", jobId: "j21", at: onDay(-7, 10, 15), actorId: "p5", kind: "message", text: "Second reminder sent, no reply" },
  { id: "act62", jobId: "j21", at: onDay(-1, 13, 31), actorId: "p3", kind: "photo", text: "3 punch photos uploaded" },
  { id: "act63", jobId: "j21", at: onDay(-1, 15, 0), actorId: "system", kind: "note", text: "Next action went overdue: send the punch photos and the past-due invoice" },

  /* ---- j12 · Arakawa envelope -------------------------------------- */
  { id: "act64", jobId: "j12", at: onDay(-38, 9, 10), actorId: "p2", kind: "stage", text: "Referral, envelope failure on a 1998 build" },
  { id: "act65", jobId: "j12", at: onDay(-24, 14, 0), actorId: "p1", kind: "estimate", text: "Version 1 sent, 71,400.00" },
  { id: "act66", jobId: "j12", at: onDay(-16, 10, 30), actorId: "p1", kind: "estimate", text: "Version 2 sent after value engineering, 67,900.00" },
  { id: "act67", jobId: "j12", at: onDay(-9, 16, 45), actorId: "p1", kind: "estimate", text: "Version 3 sent, 64,586.00, margin down to 21%", meta: "margin flag" },
  { id: "act68", jobId: "j12", at: onDay(-5, 17, 0), actorId: "customer", kind: "message", text: "Ted is waiting on the HOA scaffold vote Monday" },

  /* ---- j8 · Nakamura, waiting on the estimate ---------------------- */
  { id: "act69", jobId: "j8", at: onDay(-9, 16, 50), actorId: "p2", kind: "stage", text: "Referral from the Sundstroms" },
  { id: "act70", jobId: "j8", at: onDay(-6, 9, 0), actorId: "p5", kind: "schedule", text: "Inspection booked for Tuesday 9am" },
  { id: "act71", jobId: "j8", at: onDay(-2, 10, 20), actorId: "p2", kind: "stage", text: "Inspection done, 6 findings logged" },
  { id: "act72", jobId: "j8", at: onDay(-2, 11, 3), actorId: "p2", kind: "photo", text: "6 photos uploaded" },

  /* ---- j16 · Byrne, scheduled -------------------------------------- */
  { id: "act73", jobId: "j16", at: onDay(-9, 9, 0), actorId: "system", kind: "payment", text: "Deposit invoice INV-2274 issued, 5,227.80" },
  { id: "act74", jobId: "j16", at: onDay(-8, 11, 20), actorId: "system", kind: "payment", text: "Deposit paid by card, settled" },
  { id: "act75", jobId: "j16", at: onDay(-8, 11, 30), actorId: "p5", kind: "schedule", text: "Start confirmed for Monday the 21st, four-day block" },

  /* ---- j24 · lost -------------------------------------------------- */
  { id: "act76", jobId: "j24", at: onDay(-276, 17, 30), actorId: "customer", kind: "estimate", text: "Vincent declined by email: went with a lower bid" },
];

/* =====================================================================
 * EXPORT
 * ===================================================================== */

export function seed(): DB {

/* ------------------------------------------------------------------ *
 * Operating layer
 * ------------------------------------------------------------------ */

/** Labour actually clocked. p3 and p4 are on the Halvorsen crawl right now. */
const time: TimeEntry[] = [
  // --- j18, today, live ---
  { id: "tm1", jobId: "j18", personId: "p3", startAt: onDay(0, 6, 20), endAt: null, task: "demo", onSite: true },
  { id: "tm2", jobId: "j18", personId: "p4", startAt: onDay(0, 6, 24), endAt: null, task: "demo", onSite: true },
  { id: "tm3", jobId: "j18", personId: "p3", startAt: onDay(-1, 7, 10), endAt: onDay(-1, 15, 40), task: "demo", onSite: true },
  { id: "tm4", jobId: "j18", personId: "p4", startAt: onDay(-1, 7, 12), endAt: onDay(-1, 15, 40), task: "haul", onSite: true },
  { id: "tm5", jobId: "j18", personId: "p3", startAt: onDay(-2, 7, 5), endAt: onDay(-2, 16, 10), task: "demo", onSite: true },

  // --- j19, the deck rebuild that is eating its estimate ---
  { id: "tm6", jobId: "j19", personId: "p1", startAt: onDay(-1, 7, 30), endAt: onDay(-1, 16, 0), task: "framing", onSite: true, note: "Ledger came out worse than the estimate assumed" },
  { id: "tm7", jobId: "j19", personId: "p4", startAt: onDay(-1, 7, 30), endAt: onDay(-1, 16, 0), task: "framing", onSite: true },
  { id: "tm8", jobId: "j19", personId: "p1", startAt: onDay(-2, 7, 20), endAt: onDay(-2, 17, 5), task: "demo", onSite: true },
  { id: "tm9", jobId: "j19", personId: "p4", startAt: onDay(-2, 7, 20), endAt: onDay(-2, 17, 5), task: "demo", onSite: true },
  { id: "tm10", jobId: "j19", personId: "p1", startAt: onDay(-3, 8, 0), endAt: onDay(-3, 16, 30), task: "demo", onSite: true },
  { id: "tm11", jobId: "j19", personId: "p4", startAt: onDay(-3, 8, 0), endAt: onDay(-3, 16, 30), task: "demo", onSite: true },
  { id: "tm12", jobId: "j19", personId: "p2", startAt: onDay(-3, 13, 0), endAt: onDay(-3, 14, 30), task: "framing", onSite: true, note: "Walked the ledger with Aimee" },
  { id: "tm13", jobId: "j19", personId: "p1", startAt: onDay(-4, 7, 45), endAt: onDay(-4, 16, 15), task: "demo", onSite: true },
  { id: "tm14", jobId: "j19", personId: "p4", startAt: onDay(-4, 7, 45), endAt: onDay(-4, 16, 15), task: "demo", onSite: true },

  // --- j20, water damage ---
  { id: "tm15", jobId: "j20", personId: "p1", startAt: onDay(-1, 8, 0), endAt: onDay(-1, 14, 20), task: "barrier", onSite: true },
  { id: "tm16", jobId: "j20", personId: "p3", startAt: onDay(-2, 8, 0), endAt: onDay(-2, 15, 0), task: "framing", onSite: true },
  { id: "tm17", jobId: "j20", personId: "p1", startAt: onDay(-3, 9, 0), endAt: onDay(-3, 15, 30), task: "demo", onSite: true },

  // --- j21, punch list ---
  { id: "tm18", jobId: "j21", personId: "p3", startAt: onDay(-1, 13, 0), endAt: onDay(-1, 16, 45), task: "punch", onSite: true },
  // --- drive time is labour too, and it is where days quietly go ---
  { id: "tm19", jobId: "j19", personId: "p1", startAt: onDay(-1, 7, 0), endAt: onDay(-1, 7, 28), task: "drive", onSite: false },
  { id: "tm20", jobId: "j18", personId: "p3", startAt: onDay(0, 5, 52), endAt: onDay(0, 6, 20), task: "drive", onSite: false },
  /* the one every contractor knows: a crew left the job and never clocked out.
     Left open on purpose — the app has to catch it, not quietly bill it. */
  { id: "tm21", jobId: "j19", personId: "p4", startAt: onDay(-1, 7, 30), endAt: null, task: "framing", onSite: true, note: "Never clocked out" },
];

/**
 * Ten weeks of clocked history.
 *
 * Hand-authoring seven hundred shifts would be noise, so this is generated —
 * but generated deterministically from the day index, never from a random
 * source, so the heatmap and the week charts look identical on every run. The
 * pattern is the one this crew actually works: Monday to Friday hard, Saturday
 * catch-up, nothing on Sunday, and the job of the moment takes the crew.
 */
function history(): TimeEntry[] {
  const out: TimeEntry[] = [];
  const crews = ["p3", "p4", "p1"];
  /* history belongs to the work that was live then — not to the three jobs
     running today, whose hours are the ones being measured against estimate */
  const jobs = ["j21", "j22", "j23", "j24", "j16", "j17"];
  const tasks: TimeEntry["task"][] = ["demo", "framing", "barrier", "siding", "deck", "punch"];
  let n = 0;
  for (let back = 70; back >= 5; back--) {
    const day = new Date(NOW);
    day.setDate(day.getDate() - back);
    const dow = day.getDay();
    if (dow === 0) continue;                         // nobody works Sunday
    const crewCount = dow === 6 ? 1 : 2 + (back % 2); // Saturdays are one person
    const jobId = jobs[(back + dow) % jobs.length];
    for (let c = 0; c < crewCount; c++) {
      const startH = 7 + ((back + c) % 2);            // 7 or 8 am
      const hours = dow === 6 ? 5 : 8 + ((back + c) % 3) * 0.5;
      const start = new Date(day); start.setHours(startH, (c * 12) % 60, 0, 0);
      const end = new Date(start.getTime() + hours * 36e5);
      out.push({
        id: `th${++n}`,
        jobId,
        personId: crews[(back + c) % crews.length],
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        task: tasks[(back + c) % tasks.length],
        onSite: true,
      });
    }
  }
  return out;
}

/** What has to land before a crew can keep working. */
const materials: MaterialOrder[] = [
  {
    id: "mat1", jobId: "j19", item: "Glulam beam 5-1/8 x 12, 18 ft", qty: "1 pc",
    supplier: "Dunn Lumber, Everett", state: "will_call",
    neededBy: onDay(-1, 7, 0), promisedAt: onDay(4, 7, 0), costCents: 118400,
    note: "They will not deliver it — someone has to take the flatbed trailer",
  },
  {
    id: "mat2", jobId: "j19", item: "LUS210 joist hangers", qty: "40 ea",
    supplier: "Dunn Lumber, Everett", state: "will_call",
    neededBy: onDay(-1, 7, 0), promisedAt: onDay(4, 7, 0), costCents: 14800,
  },
  {
    id: "mat3", jobId: "j19", item: "2x10 PT #1, 16 ft", qty: "22 pc",
    supplier: "Dunn Lumber, Everett", state: "delivered",
    neededBy: onDay(-3, 7, 0), costCents: 96800, pickedUpBy: "p4",
  },
  {
    id: "mat4", jobId: "j18", item: "10-mil vapor barrier, 20x100", qty: "3 rolls",
    supplier: "Crawlspace Supply NW", state: "delivered",
    neededBy: onDay(-2, 7, 0), costCents: 64200, pickedUpBy: "p3",
  },
  {
    id: "mat5", jobId: "j18", item: "Pier blocks and PT posts", qty: "6 sets",
    supplier: "Home Depot, Lynnwood", state: "needed",
    neededBy: onDay(1, 7, 0), costCents: 28600,
    note: "Tino can grab these on the way in",
  },
  {
    id: "mat6", jobId: "j20", item: "LVL 1-3/4 x 11-7/8, 14 ft", qty: "2 pc",
    supplier: "Dunn Lumber, Everett", state: "backordered",
    neededBy: onDay(2, 7, 0), promisedAt: onDay(9, 7, 0), costCents: 41200,
    note: "Mill is out until the 26th — ask about a flitch alternative",
  },
  {
    id: "mat7", jobId: "j16", item: "Cedar tongue and groove soffit", qty: "180 lf",
    supplier: "Kirkland Cedar", state: "ordered",
    neededBy: onDay(6, 7, 0), promisedAt: onDay(5, 12, 0), costCents: 87400,
  },
];

/** Reasons to come back. This is where repeat revenue and reviews live. */
const callbacks: Callback[] = [
  {
    id: "cb1", jobId: "j21", kind: "review_ask", dueAt: onDay(0, 16, 0),
    note: "Punch list closes today — ask while the crew is still on site",
  },
  {
    id: "cb2", jobId: "j22", kind: "moisture_recheck", dueAt: onDay(12, 9, 0),
    note: "Re-read the sill plate under the bath. Anything over 20% means the source is still live.",
    baselinePct: 28,
  },
  {
    id: "cb3", jobId: "j23", kind: "warranty", dueAt: onDay(9, 8, 0),
    note: "One-year check on the reflashed ledger. Bring the moisture meter and the original photos.",
  },
  {
    id: "cb4", jobId: "j22", kind: "review_ask", dueAt: onDay(-6, 10, 0), doneAt: onDay(-6, 11, 20),
    note: "Asked at the walkthrough — she left five stars the same afternoon",
  },
  {
    id: "cb5", jobId: "j20", kind: "moisture_recheck", dueAt: onDay(3, 9, 0),
    note: "Second read at the kitchen bump-out before the barrier goes back",
    baselinePct: 31,
  },
];

/** Speed to lead. The clock that decides whether the job is ours at all. */
/** Real titles from their own published set; the numbers are fixtures. */
const reels: Reel[] = [
  { id: "r1", title: "The post you can put your finger under", format: "Homeowner warning", jobId: "j21", photoSeed: "gr-01", publishedAt: onDay(-12, 18, 0), views: 214000, saves: 3180, leads: 9, bookedCents: 4210000 },
  { id: "r2", title: "What a cedar board hides", format: "Proof", jobId: "j19", photoSeed: "gr-05", publishedAt: onDay(-9, 17, 30), views: 96400, saves: 1420, leads: 4, bookedCents: 1984200 },
  { id: "r3", title: "Why your railing is loose", format: "Homeowner warning", jobId: "j19", photoSeed: "gr-17", publishedAt: onDay(-6, 18, 10), views: 61800, saves: 910, leads: 3, bookedCents: 1120000 },
  { id: "r4", title: "The problem with cedar decking", format: "Education", jobId: "j18", photoSeed: "gr-07", publishedAt: onDay(-4, 17, 45), views: 38200, saves: 604, leads: 1, bookedCents: 0 },
  { id: "r5", title: "How he found the hole in his siding", format: "Story", jobId: "j20", photoSeed: "gr-11", publishedAt: onDay(-2, 18, 0), views: 22900, saves: 388, leads: 2, bookedCents: 762000 },
  { id: "r6", title: "Can you reuse the old cedar siding", format: "Would you rather", photoSeed: "gr-13", publishedAt: onDay(-1, 17, 20), views: 8400, saves: 131, leads: 0, bookedCents: 0 },
];

const leadResponse: LeadResponse[] = [
  {
    jobId: "j1",
    attempts: [
      { at: at({ h: -14 }), by: "p2", channel: "call", outcome: "voicemail" },
      { at: at({ h: -3 }), by: "p2", channel: "text", outcome: "no_answer" },
    ],
  },
  { jobId: "j2", attempts: [] },
  {
    jobId: "j3",
    firstTouchAt: at({ h: -11 }),
    attempts: [{ at: at({ h: -11 }), by: "p2", channel: "call", outcome: "answered" }],
  },
  {
    jobId: "j4",
    firstTouchAt: at({ d: -2, h: -1 }),
    attempts: [
      { at: at({ d: -2, h: -2 }), by: "p2", channel: "call", outcome: "no_answer" },
      { at: at({ d: -2, h: -1 }), by: "p2", channel: "call", outcome: "booked" },
    ],
  },
  {
    jobId: "j5",
    firstTouchAt: at({ d: -3, h: -6 }),
    attempts: [{ at: at({ d: -3, h: -6 }), by: "p5", channel: "text", outcome: "answered" }],
  },
];

  return {
    now: NOW_ISO,
    me: "p1",
    people,
    customers,
    properties,
    jobs,
    findings,
    photos,
    estimates,
    changeOrders,
    appointments,
    invoices,
    payments,
    threads,
    messages,
    activity,
    time: [...time, ...history()],
    materials,
    callbacks,
    leadResponse,
    reels,
  };
}
