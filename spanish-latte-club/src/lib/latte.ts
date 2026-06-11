import type { Cafe, CafeSummary, Profile, Rating, TierKey } from "@/lib/types";

export const REQUIRED_FRIEND_COUNT = 3;

export const tierOrder: TierKey[] = ["S", "A", "B", "C", "D", "Awaiting"];

export const tierLabels: Record<TierKey, string> = {
  S: "S Tier",
  A: "A Tier",
  B: "B Tier",
  C: "C Tier",
  D: "D Tier",
  Awaiting: "Awaiting verdict",
};

export function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

export function getTier(average: number | null, ratingCount: number): TierKey {
  if (average === null || ratingCount < REQUIRED_FRIEND_COUNT) {
    return "Awaiting";
  }

  if (average >= 9) return "S";
  if (average >= 8) return "A";
  if (average >= 7) return "B";
  if (average >= 6) return "C";
  return "D";
}

function ratingPhotoTime(rating: Rating) {
  return new Date(rating.updatedAt ?? `${rating.visitDate}T00:00:00`).getTime();
}

function latestRatingPhoto(ratings: Rating[]) {
  return [...ratings]
    .filter((rating) => Boolean(rating.photoUrl))
    .sort((a, b) => ratingPhotoTime(b) - ratingPhotoTime(a))[0]?.photoUrl;
}

export function summarizeCafe(cafe: Cafe, ratings: Rating[]): CafeSummary {
  const cafeRatings = ratings.filter((rating) => rating.cafeId === cafe.id);
  const replacementPhotoUrl = latestRatingPhoto(cafeRatings);
  const average =
    cafeRatings.length > 0
      ? roundScore(
          cafeRatings.reduce((total, rating) => total + rating.overall, 0) /
            cafeRatings.length
        )
      : null;

  const topComment =
    [...cafeRatings]
      .filter((rating) => rating.comment.trim().length > 0)
      .sort((a, b) => b.overall - a.overall)[0]?.comment ?? "";

  return {
    cafe: replacementPhotoUrl
      ? {
          ...cafe,
          photoUrl: replacementPhotoUrl,
        }
      : cafe,
    ratings: cafeRatings,
    average,
    tier: getTier(average, cafeRatings.length),
    isComplete: cafeRatings.length >= REQUIRED_FRIEND_COUNT,
    topComment,
  };
}

export function summarizeCafes(cafes: Cafe[], ratings: Rating[]) {
  return cafes
    .map((cafe) => summarizeCafe(cafe, ratings))
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
}

export function profileAverage(profile: Profile, ratings: Rating[]) {
  const ownRatings = ratings.filter((rating) => rating.userId === profile.id);

  if (!ownRatings.length) {
    return null;
  }

  return roundScore(
    ownRatings.reduce((total, rating) => total + rating.overall, 0) /
      ownRatings.length
  );
}

export function favoriteCafeForProfile(
  profile: Profile,
  cafes: Cafe[],
  ratings: Rating[]
) {
  const topRating = ratings
    .filter((rating) => rating.userId === profile.id)
    .sort((a, b) => b.overall - a.overall)[0];

  if (!topRating) {
    return null;
  }

  return cafes.find((cafe) => cafe.id === topRating.cafeId) ?? null;
}

export function worstCafeForProfile(
  profile: Profile,
  cafes: Cafe[],
  ratings: Rating[]
) {
  const lowestRating = ratings
    .filter((rating) => rating.userId === profile.id)
    .sort((a, b) => a.overall - b.overall)[0];

  if (!lowestRating) {
    return null;
  }

  return cafes.find((cafe) => cafe.id === lowestRating.cafeId) ?? null;
}

export function getAlignedPair(profiles: Profile[], ratings: Rating[]) {
  const pairs: { label: string; delta: number }[] = [];

  for (let i = 0; i < profiles.length; i += 1) {
    for (let j = i + 1; j < profiles.length; j += 1) {
      const left = profiles[i];
      const right = profiles[j];
      const sharedCafeIds = new Set(
        ratings
          .filter((rating) => rating.userId === left.id)
          .map((rating) => rating.cafeId)
          .filter((cafeId) =>
            ratings.some(
              (rating) =>
                rating.userId === right.id && rating.cafeId === cafeId
            )
          )
      );

      if (!sharedCafeIds.size) {
        continue;
      }

      const delta =
        [...sharedCafeIds].reduce((total, cafeId) => {
          const leftRating = ratings.find(
            (rating) => rating.userId === left.id && rating.cafeId === cafeId
          );
          const rightRating = ratings.find(
            (rating) => rating.userId === right.id && rating.cafeId === cafeId
          );

          if (!leftRating || !rightRating) {
            return total;
          }

          return total + Math.abs(leftRating.overall - rightRating.overall);
        }, 0) / sharedCafeIds.size;

      pairs.push({
        label: `${left.displayName} + ${right.displayName}`,
        delta: roundScore(delta),
      });
    }
  }

  return pairs.sort((a, b) => a.delta - b.delta)[0] ?? null;
}
