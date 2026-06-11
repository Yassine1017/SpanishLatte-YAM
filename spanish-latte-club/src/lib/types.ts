export type Profile = {
  id: string;
  email: string;
  displayName: string;
  initials: string;
  avatarColor: string;
};

export type Cafe = {
  id: string;
  name: string;
  city: string;
  area: string;
  notes: string;
  visitDate: string;
  photoUrl: string | null;
  createdBy: string;
};

export type Rating = {
  id: string;
  cafeId: string;
  userId: string;
  overall: number;
  sweetness: number;
  coffeeStrength: number;
  priceValue: number;
  creaminess: number;
  comment: string;
  visitDate: string;
  wouldOrderAgain: boolean;
  photoUrl: string | null;
  updatedAt?: string;
};

export type TierKey = "S" | "A" | "B" | "C" | "D" | "Awaiting";

export type CafeSummary = {
  cafe: Cafe;
  ratings: Rating[];
  average: number | null;
  tier: TierKey;
  isComplete: boolean;
  topComment: string;
};
