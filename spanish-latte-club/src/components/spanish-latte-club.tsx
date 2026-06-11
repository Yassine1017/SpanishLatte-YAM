"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Coffee,
  Crown,
  Filter,
  Heart,
  Loader2,
  LockKeyhole,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  Scale,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { demoCafes, demoProfiles, demoRatings } from "@/lib/demo-data";
import {
  REQUIRED_FRIEND_COUNT,
  favoriteCafeForProfile,
  getAlignedPair,
  profileAverage,
  summarizeCafes,
  tierLabels,
  tierOrder,
} from "@/lib/latte";
import { cn } from "@/lib/utils";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { Cafe, CafeSummary, Profile, Rating, TierKey } from "@/lib/types";

type ActiveTab = "tiers" | "tierList" | "friends";
type CompletenessFilter = "all" | "complete" | "waiting";
type DateFilter = "all" | "month" | "recent";

type FriendLoginOption = {
  id: "yassine" | "aziz" | "mariam";
  displayName: string;
  initials: string;
  email: string;
  avatarColor: string;
};

type RatingDraft = {
  overall: number;
  sweetness: number;
  coffeeStrength: number;
  priceValue: number;
  creaminess: number;
  comment: string;
  visitDate: string;
  wouldOrderAgain: boolean;
  photoFile: File | null;
};

type CafeDraft = {
  name: string;
  city: string;
  area: string;
  notes: string;
  visitDate: string;
  photoFile: File | null;
  rateNow: boolean;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  initials: string;
  avatar_color: string;
};

type CafeRow = {
  id: string;
  created_by: string;
  name: string;
  city: string;
  area: string;
  notes: string | null;
  visit_date: string;
  photo_url: string | null;
};

type RatingRow = {
  id: string;
  cafe_id: string;
  user_id: string;
  overall: number | string;
  sweetness: number;
  coffee_strength: number;
  price_value: number;
  creaminess: number;
  comment: string | null;
  visit_date: string;
  would_order_again: boolean;
  photo_url: string | null;
};

const today = new Date().toISOString().slice(0, 10);

const friendLoginOptions: FriendLoginOption[] = [
  {
    id: "yassine",
    displayName: "Yassine",
    initials: "YA",
    email:
      process.env.NEXT_PUBLIC_YAM_YASSINE_EMAIL?.toLowerCase() ??
      "yassine@yam.club",
    avatarColor: "#7b3f2b",
  },
  {
    id: "aziz",
    displayName: "Aziz",
    initials: "AZ",
    email:
      process.env.NEXT_PUBLIC_YAM_AZIZ_EMAIL?.toLowerCase() ??
      "aziz@yam.club",
    avatarColor: "#b8752f",
  },
  {
    id: "mariam",
    displayName: "Mariam",
    initials: "MA",
    email:
      process.env.NEXT_PUBLIC_YAM_MARIAM_EMAIL?.toLowerCase() ??
      "mariam@yam.club",
    avatarColor: "#47624f",
  },
];

const tierStyles: Record<
  TierKey,
  {
    accent: string;
    label: string;
    ring: string;
  }
> = {
  S: {
    accent: "bg-[color:var(--club-caramel)] text-primary",
    label: "Best in the city",
    ring: "ring-[color:var(--club-caramel)]/45",
  },
  A: {
    accent: "bg-[color:var(--club-sage)] text-primary-foreground",
    label: "Worth a detour",
    ring: "ring-[color:var(--club-sage)]/35",
  },
  B: {
    accent: "bg-secondary text-secondary-foreground",
    label: "Solid cup",
    ring: "ring-border",
  },
  C: {
    accent: "bg-muted text-muted-foreground",
    label: "Needs a reason",
    ring: "ring-border",
  },
  D: {
    accent: "bg-[color:var(--club-berry)] text-primary-foreground",
    label: "For emergencies",
    ring: "ring-[color:var(--club-berry)]/25",
  },
  Awaiting: {
    accent: "bg-card text-muted-foreground",
    label: "Waiting for the full council.",
    ring: "ring-border",
  },
};

function blankRatingDraft(): RatingDraft {
  return {
    overall: 8,
    sweetness: 3,
    coffeeStrength: 3,
    priceValue: 3,
    creaminess: 4,
    comment: "",
    visitDate: today,
    wouldOrderAgain: true,
    photoFile: null,
  };
}

function blankCafeDraft(): CafeDraft {
  return {
    name: "",
    city: "Bahrain",
    area: "",
    notes: "",
    visitDate: today,
    photoFile: null,
    rateNow: true,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

const GROUPED_BRANCH_AREA = "Multiple branches";

function isGroupedBranchCafe(cafe: Pick<Cafe, "area">) {
  return cafe.area.toLowerCase() === GROUPED_BRANCH_AREA.toLowerCase();
}

function formatCafeLocation(cafe: Pick<Cafe, "city" | "area">) {
  if (isGroupedBranchCafe(cafe)) {
    return "";
  }

  if (!cafe.area || cafe.area === cafe.city) {
    return cafe.city;
  }

  if (cafe.city.toLowerCase() === "bahrain") {
    return cafe.area;
  }

  return `${cafe.area}, ${cafe.city}`;
}

const knownBranchBrands = [
  "The Coffee Bean & Tea Leaf",
  "Black 22 Coffee Bar & Roastery",
  "Neo Books & Coffee",
  "Nomad Urban Eatery",
  "Baker & Spice",
  "Higher Grounds",
  "ARENA Speciality Coffee",
  "Arena Specialty Coffee",
  "Crust & Crema",
  "Cafe Lilou",
  "Cafe Sego",
  "Black Drop",
  "Dose Cafe",
  "My Cafe",
  "Ohana Cafe",
  "Reef Cafe",
  "Petiole Cafe",
  "GB Cafe",
  "Le Chocolat",
  "The Orangery",
  "Costa Coffee",
  "Tim Hortons",
  "Caribou Coffee",
  "Barns",
  "Starbucks",
  "668",
].sort((left, right) => right.length - left.length);

function getCafeBrand(name: string) {
  const normalizedName = name.toLowerCase();
  const brand = knownBranchBrands.find((item) =>
    normalizedName.startsWith(item.toLowerCase())
  );

  return brand ?? name;
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    initials: row.initials,
    avatarColor: row.avatar_color,
  };
}

function mapCafe(row: CafeRow): Cafe {
  return {
    id: row.id,
    createdBy: row.created_by,
    name: row.name,
    city: row.city,
    area: row.area,
    notes: row.notes ?? "",
    visitDate: row.visit_date,
    photoUrl: row.photo_url,
  };
}

function mapRating(row: RatingRow): Rating {
  return {
    id: row.id,
    cafeId: row.cafe_id,
    userId: row.user_id,
    overall: Number(row.overall),
    sweetness: row.sweetness,
    coffeeStrength: row.coffee_strength,
    priceValue: row.price_value,
    creaminess: row.creaminess,
    comment: row.comment ?? "",
    visitDate: row.visit_date,
    wouldOrderAgain: row.would_order_again,
    photoUrl: row.photo_url,
  };
}

function toRatingDraft(rating?: Rating): RatingDraft {
  if (!rating) {
    return blankRatingDraft();
  }

  return {
    overall: rating.overall,
    sweetness: rating.sweetness,
    coffeeStrength: rating.coffeeStrength,
    priceValue: rating.priceValue,
    creaminess: rating.creaminess,
    comment: rating.comment,
    visitDate: rating.visitDate,
    wouldOrderAgain: rating.wouldOrderAgain,
    photoFile: null,
  };
}

export function SpanishLatteClub() {
  const remoteMode = isSupabaseConfigured();
  const [profiles, setProfiles] = useState<Profile[]>(demoProfiles);
  const [cafes, setCafes] = useState<Cafe[]>(demoCafes);
  const [ratings, setRatings] = useState<Rating[]>(demoRatings);
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    remoteMode ? null : demoProfiles[0].id
  );
  const [selectedCafeId, setSelectedCafeId] = useState(demoCafes[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<ActiveTab>("tiers");
  const [areaFilter, setAreaFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [completenessFilter, setCompletenessFilter] =
    useState<CompletenessFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedLoginId, setSelectedLoginId] =
    useState<FriendLoginOption["id"]>("yassine");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [loadMessage, setLoadMessage] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(remoteMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addCafeOpen, setAddCafeOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [editingCafeId, setEditingCafeId] = useState<string | null>(null);
  const [newCafe, setNewCafe] = useState<CafeDraft>(() => blankCafeDraft());
  const [ratingDraft, setRatingDraft] = useState<RatingDraft>(() =>
    blankRatingDraft()
  );

  const supabase = remoteMode ? getSupabaseBrowserClient() : null;

  const currentUser = useMemo(
    () => profiles.find((profile) => profile.id === currentUserId) ?? null,
    [currentUserId, profiles]
  );

  const summaries = useMemo(() => summarizeCafes(cafes, ratings), [
    cafes,
    ratings,
  ]);
  const visibleSummaries = useMemo(
    () => summaries.filter((summary) => !isGroupedBranchCafe(summary.cafe)),
    [summaries]
  );

  const areaOptions = useMemo(() => {
    const uniqueAreas = new Set(cafes.map(formatCafeLocation).filter(Boolean));

    return ["all", ...Array.from(uniqueAreas)];
  }, [cafes]);

  const filteredSummaries = useMemo(() => {
    const now = new Date();

    return visibleSummaries.filter((summary) => {
      const haystack =
        `${summary.cafe.name} ${summary.cafe.city} ${summary.cafe.area}`.toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.trim().toLowerCase());
      const matchesArea =
        areaFilter === "all" || formatCafeLocation(summary.cafe) === areaFilter;
      const matchesCompleteness =
        completenessFilter === "all" ||
        (completenessFilter === "complete" && summary.isComplete) ||
        (completenessFilter === "waiting" && !summary.isComplete);
      const visitDate = new Date(`${summary.cafe.visitDate}T00:00:00`);
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "month" &&
          visitDate.getMonth() === now.getMonth() &&
          visitDate.getFullYear() === now.getFullYear()) ||
        (dateFilter === "recent" &&
          now.getTime() - visitDate.getTime() <= 1000 * 60 * 60 * 24 * 30);

      return (
        matchesSearch && matchesArea && matchesCompleteness && matchesDate
      );
    });
  }, [areaFilter, completenessFilter, dateFilter, searchTerm, visibleSummaries]);

  const summariesByTier = useMemo(() => {
    const grouped = new Map<TierKey, CafeSummary[]>();

    tierOrder.forEach((tier) => grouped.set(tier, []));
    filteredSummaries.forEach((summary) => {
      grouped.get(summary.tier)?.push(summary);
    });

    return grouped;
  }, [filteredSummaries]);

  const selectedSummary =
    visibleSummaries.find((summary) => summary.cafe.id === selectedCafeId) ??
    visibleSummaries[0] ??
    null;

  const selectedBranchSummaries = useMemo(() => {
    if (!selectedSummary) {
      return [];
    }

    const selectedBrand = getCafeBrand(selectedSummary.cafe.name);

    return summaries
      .filter(
        (summary) =>
          getCafeBrand(summary.cafe.name) === selectedBrand &&
          !isGroupedBranchCafe(summary.cafe)
      )
      .sort((left, right) =>
        formatCafeLocation(left.cafe).localeCompare(
          formatCafeLocation(right.cafe)
        )
      );
  }, [selectedSummary, summaries]);

  const friendStats = useMemo(() => {
    const averages = profiles.map((profile) => ({
      profile,
      average: profileAverage(profile, ratings),
      favorite: favoriteCafeForProfile(profile, cafes, ratings),
    }));

    const scored = averages.flatMap((item) =>
      item.average === null ? [] : [{ ...item, average: item.average }]
    );

    return {
      averages,
      mostGenerous: [...scored].sort((a, b) => b.average - a.average)[0] ?? null,
      strictest: [...scored].sort((a, b) => a.average - b.average)[0] ?? null,
      alignedPair: getAlignedPair(profiles, ratings),
    };
  }, [cafes, profiles, ratings]);

  useEffect(() => {
    if (!remoteMode || !supabase) {
      return;
    }

    const client = supabase;
    let mounted = true;

    async function loadSession() {
      setIsCheckingAuth(true);
      const { data } = await client.auth.getUser();

      if (!mounted) {
        return;
      }

      if (!data.user) {
        setCurrentUserId(null);
        setIsCheckingAuth(false);
        return;
      }

      setCurrentUserId(data.user.id);
      await fetchRemoteData(client, data.user.id);
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_, session) => {
      if (!session?.user) {
        setCurrentUserId(null);
        setProfiles([]);
        setCafes([]);
        setRatings([]);
        setIsCheckingAuth(false);
        return;
      }

      setCurrentUserId(session.user.id);
      void fetchRemoteData(client, session.user.id);
    });

    void loadSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [remoteMode, supabase]);

  async function fetchRemoteData(client: SupabaseClient, authUserId: string) {
    setLoadMessage("");

    const [profilesResult, cafesResult, ratingsResult] = await Promise.all([
      client.from("profiles").select("*").order("created_at"),
      client.from("cafes").select("*").order("visit_date", {
        ascending: false,
      }),
      client.from("ratings").select("*").order("created_at"),
    ]);

    if (profilesResult.error || cafesResult.error || ratingsResult.error) {
      setLoadMessage(
        profilesResult.error?.message ??
          cafesResult.error?.message ??
          ratingsResult.error?.message ??
          "Could not load the club."
      );
      setIsCheckingAuth(false);
      return;
    }

    const nextProfiles = (profilesResult.data ?? []).map((row) =>
      mapProfile(row as ProfileRow)
    );
    const nextCafes = (cafesResult.data ?? []).map((row) =>
      mapCafe(row as CafeRow)
    );
    const nextRatings = (ratingsResult.data ?? []).map((row) =>
      mapRating(row as RatingRow)
    );

    setProfiles(nextProfiles);
    setCafes(nextCafes);
    setRatings(nextRatings);
    setCurrentUserId(authUserId);
    setSelectedCafeId((current) => current || nextCafes[0]?.id || "");
    setIsCheckingAuth(false);

    if (!nextProfiles.some((profile) => profile.id === authUserId)) {
      setLoadMessage("This email is not on the three-person invite list.");
    }
  }

  async function uploadPhoto(file: File | null, folder: string) {
    if (!file) {
      return null;
    }

    if (!remoteMode || !supabase || !currentUserId) {
      return URL.createObjectURL(file);
    }

    const extension = file.name.split(".").pop() ?? "jpg";
    const path = `${folder}/${currentUserId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("latte-photos")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from("latte-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handlePasswordLogin() {
    const selectedFriend = friendLoginOptions.find(
      (friend) => friend.id === selectedLoginId
    );

    if (!supabase || !selectedFriend || !authPassword.trim()) {
      return;
    }

    setIsSubmitting(true);
    setAuthMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: selectedFriend.email,
      password: authPassword,
    });

    if (error) {
      setAuthMessage("That password did not open the club door.");
      setIsSubmitting(false);
      return;
    }

    setAuthPassword("");
    setIsSubmitting(false);
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setCurrentUserId(null);
  }

  function openRatingDialog(cafeId: string) {
    const existingRating = ratings.find(
      (rating) => rating.cafeId === cafeId && rating.userId === currentUserId
    );

    setEditingCafeId(cafeId);
    setRatingDraft(toRatingDraft(existingRating));
    setRatingOpen(true);
  }

  async function handleAddCafe() {
    if (!currentUser || !newCafe.name.trim() || !newCafe.area.trim()) {
      return;
    }

    setIsSubmitting(true);
    setLoadMessage("");

    try {
      const photoUrl = await uploadPhoto(newCafe.photoFile, "cafes");

      if (remoteMode && supabase) {
        const { data, error } = await supabase
          .from("cafes")
          .insert({
            created_by: currentUser.id,
            name: newCafe.name.trim(),
            city: newCafe.city.trim(),
            area: newCafe.area.trim(),
            notes: newCafe.notes.trim(),
            visit_date: newCafe.visitDate,
            photo_url: photoUrl,
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        if (newCafe.rateNow) {
          await saveRatingToSupabase(data.id, ratingDraft);
        }

        await fetchRemoteData(supabase, currentUser.id);
        setSelectedCafeId(data.id);
      } else {
        const createdCafe: Cafe = {
          id: `cafe-${Date.now()}`,
          createdBy: currentUser.id,
          name: newCafe.name.trim(),
          city: newCafe.city.trim(),
          area: newCafe.area.trim(),
          notes: newCafe.notes.trim(),
          visitDate: newCafe.visitDate,
          photoUrl,
        };

        setCafes((previous) => [createdCafe, ...previous]);

        if (newCafe.rateNow) {
          setRatings((previous) => [
            {
              id: `rating-${Date.now()}`,
              cafeId: createdCafe.id,
              userId: currentUser.id,
              overall: ratingDraft.overall,
              sweetness: ratingDraft.sweetness,
              coffeeStrength: ratingDraft.coffeeStrength,
              priceValue: ratingDraft.priceValue,
              creaminess: ratingDraft.creaminess,
              comment: ratingDraft.comment.trim(),
              visitDate: ratingDraft.visitDate,
              wouldOrderAgain: ratingDraft.wouldOrderAgain,
              photoUrl: ratingDraft.photoFile
                ? URL.createObjectURL(ratingDraft.photoFile)
                : null,
            },
            ...previous,
          ]);
        }

        setSelectedCafeId(createdCafe.id);
      }

      setNewCafe(blankCafeDraft());
      setRatingDraft(blankRatingDraft());
      setAddCafeOpen(false);
    } catch (error) {
      setLoadMessage(
        error instanceof Error ? error.message : "Could not add that cafe."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveRatingToSupabase(cafeId: string, draft: RatingDraft) {
    if (!supabase || !currentUser) {
      return;
    }

    const photoUrl = await uploadPhoto(draft.photoFile, "ratings");

    const { error } = await supabase.from("ratings").upsert(
      {
        cafe_id: cafeId,
        user_id: currentUser.id,
        overall: draft.overall,
        sweetness: draft.sweetness,
        coffee_strength: draft.coffeeStrength,
        price_value: draft.priceValue,
        creaminess: draft.creaminess,
        comment: draft.comment.trim(),
        visit_date: draft.visitDate,
        would_order_again: draft.wouldOrderAgain,
        photo_url: photoUrl,
      },
      { onConflict: "cafe_id,user_id" }
    );

    if (error) {
      throw error;
    }
  }

  async function handleSaveRating() {
    if (!editingCafeId || !currentUser) {
      return;
    }

    setIsSubmitting(true);
    setLoadMessage("");

    try {
      if (remoteMode && supabase) {
        await saveRatingToSupabase(editingCafeId, ratingDraft);
        await fetchRemoteData(supabase, currentUser.id);
      } else {
        const photoUrl = ratingDraft.photoFile
          ? URL.createObjectURL(ratingDraft.photoFile)
          : null;

        setRatings((previous) => {
          const existing = previous.find(
            (rating) =>
              rating.cafeId === editingCafeId && rating.userId === currentUser.id
          );

          if (!existing) {
            return [
              {
                id: `rating-${Date.now()}`,
                cafeId: editingCafeId,
                userId: currentUser.id,
                overall: ratingDraft.overall,
                sweetness: ratingDraft.sweetness,
                coffeeStrength: ratingDraft.coffeeStrength,
                priceValue: ratingDraft.priceValue,
                creaminess: ratingDraft.creaminess,
                comment: ratingDraft.comment.trim(),
                visitDate: ratingDraft.visitDate,
                wouldOrderAgain: ratingDraft.wouldOrderAgain,
                photoUrl,
              },
              ...previous,
            ];
          }

          return previous.map((rating) =>
            rating.id === existing.id
              ? {
                  ...rating,
                  overall: ratingDraft.overall,
                  sweetness: ratingDraft.sweetness,
                  coffeeStrength: ratingDraft.coffeeStrength,
                  priceValue: ratingDraft.priceValue,
                  creaminess: ratingDraft.creaminess,
                  comment: ratingDraft.comment.trim(),
                  visitDate: ratingDraft.visitDate,
                  wouldOrderAgain: ratingDraft.wouldOrderAgain,
                  photoUrl: photoUrl ?? rating.photoUrl,
                }
              : rating
          );
        });
      }

      setRatingOpen(false);
    } catch (error) {
      setLoadMessage(
        error instanceof Error ? error.message : "Could not save that rating."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteOwnRating() {
    if (!editingCafeId || !currentUser) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (remoteMode && supabase) {
        const { error } = await supabase
          .from("ratings")
          .delete()
          .eq("cafe_id", editingCafeId)
          .eq("user_id", currentUser.id);

        if (error) {
          throw error;
        }

        await fetchRemoteData(supabase, currentUser.id);
      } else {
        setRatings((previous) =>
          previous.filter(
            (rating) =>
              !(
                rating.cafeId === editingCafeId &&
                rating.userId === currentUser.id
              )
          )
        );
      }

      setRatingOpen(false);
    } catch (error) {
      setLoadMessage(
        error instanceof Error ? error.message : "Could not remove that rating."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateRatingDraft<K extends keyof RatingDraft>(
    key: K,
    value: RatingDraft[K]
  ) {
    setRatingDraft((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  if (remoteMode && isCheckingAuth) {
    return <ClubLoadingScreen />;
  }

  if (remoteMode && !currentUserId) {
    return (
      <LoginScreen
        authMessage={authMessage}
        authPassword={authPassword}
        friends={friendLoginOptions}
        isSubmitting={isSubmitting}
        selectedFriendId={selectedLoginId}
        onPasswordChange={setAuthPassword}
        onSelectFriend={setSelectedLoginId}
        onSubmit={handlePasswordLogin}
      />
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-3 sm:px-6 sm:py-6 lg:gap-6">
        <header className="overflow-hidden rounded-lg bg-primary text-primary-foreground club-shadow">
          <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/12 ring-1 ring-primary-foreground/15">
                  <Coffee />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold leading-tight sm:text-3xl">
                    YAM
                  </h1>
                  <p className="text-sm text-primary-foreground/72">
                    Three friends. One shared mission.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 text-sm text-primary-foreground/80 sm:grid-cols-3">
                <MiniStat
                  icon={Trophy}
                  label="Bahrain cafes"
                  value={visibleSummaries.length.toString()}
                />
                <MiniStat
                  icon={Users}
                  label="Council"
                  value={`${profiles.length}/${REQUIRED_FRIEND_COUNT}`}
                />
                <MiniStat
                  icon={Sparkles}
                  label="Top score"
                  value={
                    visibleSummaries[0]?.average !== null &&
                    visibleSummaries[0]?.average
                      ? visibleSummaries[0].average.toFixed(1)
                      : "New"
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {!remoteMode && (
                <div className="flex rounded-lg bg-primary-foreground/10 p-1">
                  {profiles.map((profile) => (
                    <Tooltip key={profile.id}>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            className={cn(
                              "rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                              currentUserId === profile.id
                                ? "bg-primary-foreground text-primary"
                                : "text-primary-foreground/78 hover:bg-primary-foreground/10"
                            )}
                            onClick={() => setCurrentUserId(profile.id)}
                          />
                        }
                      >
                        {profile.displayName}
                      </TooltipTrigger>
                      <TooltipContent>Preview as {profile.displayName}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}

              {currentUser && (
                <div className="flex items-center gap-2 rounded-lg bg-primary-foreground/10 px-2 py-1.5">
                  <FriendAvatar profile={currentUser} />
                  <span className="text-sm font-medium">
                    {currentUser.displayName}
                  </span>
                </div>
              )}

              {remoteMode && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSignOut}
                  className="bg-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/18"
                >
                  <LogOut data-icon="inline-start" />
                  Sign out
                </Button>
              )}
            </div>
          </div>
        </header>

        {loadMessage && (
          <div className="rounded-lg border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            {loadMessage}
          </div>
        )}

        {!remoteMode && (
          <div className="flex flex-col gap-2 rounded-lg border bg-card/70 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Demo preview is running locally. Add Supabase keys to enforce auth
              and RLS.
            </span>
            <Badge variant="secondary" className="w-fit">
              Private app ready
            </Badge>
          </div>
        )}

        <div
          className={cn(
            "grid gap-4 lg:items-start",
            activeTab === "tierList"
              ? "lg:grid-cols-1"
              : "lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]"
          )}
        >
          <section className="min-w-0 rounded-lg border bg-background/70 p-3 shadow-sm backdrop-blur sm:p-4">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as ActiveTab)}
              className="gap-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <TabsList className="w-full sm:w-fit">
                  <TabsTrigger value="tiers" className="flex-1 sm:flex-none">
                    <Trophy data-icon="inline-start" />
                    Bahrain list
                  </TabsTrigger>
                  <TabsTrigger value="tierList" className="flex-1 sm:flex-none">
                    <Crown data-icon="inline-start" />
                    Tier list
                  </TabsTrigger>
                  <TabsTrigger value="friends" className="flex-1 sm:flex-none">
                    <Scale data-icon="inline-start" />
                    Friends
                  </TabsTrigger>
                </TabsList>

                <Button
                  onClick={() => setAddCafeOpen(true)}
                  className="h-9"
                  disabled={!currentUser}
                >
                  <Plus data-icon="inline-start" />
                  Missing cafe?
                </Button>
              </div>

              <TabsContent value="tiers" className="flex flex-col gap-4">
                <FilterBar
                  areaFilter={areaFilter}
                  areaOptions={areaOptions}
                  completenessFilter={completenessFilter}
                  dateFilter={dateFilter}
                  searchTerm={searchTerm}
                  onAreaChange={setAreaFilter}
                  onCompletenessChange={setCompletenessFilter}
                  onDateChange={setDateFilter}
                  onSearchChange={setSearchTerm}
                />

                {filteredSummaries.length ? (
                  <div className="flex flex-col gap-5">
                    {tierOrder.map((tier) => (
                      <TierSection
                        key={tier}
                        tier={tier}
                        summaries={summariesByTier.get(tier) ?? []}
                        profiles={profiles}
                        currentUserId={currentUserId}
                        selectedCafeId={selectedCafeId}
                        onRate={openRatingDialog}
                        onSelect={setSelectedCafeId}
                      />
                    ))}
                  </div>
                ) : (
                  <Empty className="min-h-72 rounded-lg border bg-card">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Search />
                      </EmptyMedia>
                      <EmptyTitle>No lattes judged yet.</EmptyTitle>
                      <EmptyDescription>
                        Clear the filters or search another Bahrain cafe.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </TabsContent>

              <TabsContent value="tierList" className="flex flex-col gap-4">
                <FilterBar
                  areaFilter={areaFilter}
                  areaOptions={areaOptions}
                  completenessFilter={completenessFilter}
                  dateFilter={dateFilter}
                  searchTerm={searchTerm}
                  onAreaChange={setAreaFilter}
                  onCompletenessChange={setCompletenessFilter}
                  onDateChange={setDateFilter}
                  onSearchChange={setSearchTerm}
                />

                <CompactTierList
                  groupedSummaries={summariesByTier}
                  profiles={profiles}
                  selectedCafeId={selectedCafeId}
                  onSelect={setSelectedCafeId}
                />
              </TabsContent>

              <TabsContent value="friends">
                <FriendComparison
                  profiles={profiles}
                  ratings={ratings}
                  stats={friendStats}
                />
              </TabsContent>
            </Tabs>
          </section>

          {activeTab !== "tierList" && (
            <CafeDetail
              branchSummaries={selectedBranchSummaries}
              profiles={profiles}
              summary={selectedSummary}
              onSelectBranch={setSelectedCafeId}
            />
          )}
        </div>
      </div>

      <AddCafeDialog
        draft={newCafe}
        isOpen={addCafeOpen}
        isSubmitting={isSubmitting}
        ratingDraft={ratingDraft}
        onDraftChange={setNewCafe}
        onOpenChange={(open) => setAddCafeOpen(open)}
        onRatingDraftChange={setRatingDraft}
        onSubmit={handleAddCafe}
      />

      <RatingDialog
        cafeName={
          cafes.find((cafe) => cafe.id === editingCafeId)?.name ?? "this cafe"
        }
        draft={ratingDraft}
        hasExistingRating={Boolean(
          ratings.find(
            (rating) =>
              rating.cafeId === editingCafeId && rating.userId === currentUserId
          )
        )}
        isOpen={ratingOpen}
        isSubmitting={isSubmitting}
        onDelete={handleDeleteOwnRating}
        onDraftChange={setRatingDraft}
        onOpenChange={(open) => setRatingOpen(open)}
        onSubmit={handleSaveRating}
        updateField={updateRatingDraft}
      />
    </main>
  );
}

function ClubLoadingScreen() {
  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <Skeleton className="h-28 rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Skeleton className="h-[620px] rounded-lg" />
          <Skeleton className="h-[620px] rounded-lg" />
        </div>
      </div>
    </main>
  );
}

function LoginScreen({
  authMessage,
  authPassword,
  friends,
  isSubmitting,
  selectedFriendId,
  onPasswordChange,
  onSelectFriend,
  onSubmit,
}: {
  authMessage: string;
  authPassword: string;
  friends: FriendLoginOption[];
  isSubmitting: boolean;
  selectedFriendId: FriendLoginOption["id"];
  onPasswordChange: (value: string) => void;
  onSelectFriend: (value: FriendLoginOption["id"]) => void;
  onSubmit: () => void;
}) {
  const selectedFriend = friends.find((friend) => friend.id === selectedFriendId);

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-lg border bg-card club-shadow lg:grid-cols-[1fr_0.95fr]">
        <div className="flex min-h-[420px] flex-col justify-between bg-primary p-6 text-primary-foreground sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary-foreground/12 ring-1 ring-primary-foreground/15">
              <LockKeyhole />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">YAM</h1>
              <p className="text-sm text-primary-foreground/70">
                Three friends. One shared mission.
              </p>
            </div>
          </div>

          <div className="max-w-sm">
            <p className="text-4xl font-semibold leading-tight">
              Private verdicts for very serious coffee research.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-5 p-6 sm:p-8">
          <div>
            <h2 className="text-xl font-semibold">Enter the club</h2>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel>Who is tasting today?</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {friends.map((friend) => {
                  const isSelected = friend.id === selectedFriendId;

                  return (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => onSelectFriend(friend.id)}
                      className={cn(
                        "flex min-w-0 flex-col items-center gap-2 rounded-lg border p-3 text-sm transition hover:border-primary/45 hover:bg-secondary",
                        isSelected
                          ? "border-primary bg-secondary text-primary shadow-sm"
                          : "border-border bg-background text-muted-foreground"
                      )}
                    >
                      <span
                        className="flex size-10 items-center justify-center rounded-lg text-xs font-semibold text-white"
                        style={{ backgroundColor: friend.avatarColor }}
                      >
                        {friend.initials}
                      </span>
                      <span className="truncate font-medium">
                        {friend.displayName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Club password</FieldLabel>
              <Input
                id="password"
                type="password"
                value={authPassword}
                placeholder={
                  selectedFriend
                    ? `${selectedFriend.displayName} enters the club password`
                    : "Enter the club password"
                }
                onChange={(event) =>
                  onPasswordChange(event.currentTarget.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" && authPassword.trim()) {
                    onSubmit();
                  }
                }}
              />
            </Field>
          </FieldGroup>

          {authMessage && (
            <p className="rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {authMessage}
            </p>
          )}

          <Button onClick={onSubmit} disabled={isSubmitting || !authPassword}>
            {isSubmitting ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Sparkles data-icon="inline-start" />
            )}
            Enter YAM
          </Button>
        </div>
      </section>
    </main>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-primary-foreground/9 px-3 py-2 ring-1 ring-primary-foreground/10">
      <Icon />
      <div className="min-w-0">
        <p className="truncate text-xs text-primary-foreground/62">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

function FilterBar({
  areaFilter,
  areaOptions,
  completenessFilter,
  dateFilter,
  searchTerm,
  onAreaChange,
  onCompletenessChange,
  onDateChange,
  onSearchChange,
}: {
  areaFilter: string;
  areaOptions: string[];
  completenessFilter: CompletenessFilter;
  dateFilter: DateFilter;
  searchTerm: string;
  onAreaChange: (value: string) => void;
  onCompletenessChange: (value: CompletenessFilter) => void;
  onDateChange: (value: DateFilter) => void;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-lg border bg-card p-3">
      <label className="relative flex min-w-0 flex-1 items-center">
        <Search className="pointer-events-none absolute left-3 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
          placeholder="Search Bahrain cafes"
          className="h-11 min-w-0 pl-9"
        />
      </label>

      <div className="grid min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2 min-[620px]:grid-cols-3">
        <FilterSelect
          icon={MapPin}
          label="Area"
          value={areaFilter}
          options={areaOptions.map((option) => ({
            label: option === "all" ? "All areas" : option,
            value: option,
          }))}
          onChange={onAreaChange}
        />
        <FilterSelect
          icon={Check}
          label="Verdict"
          value={completenessFilter}
          options={[
            { label: "All verdicts", value: "all" },
            { label: "Fully rated", value: "complete" },
            { label: "Awaiting", value: "waiting" },
          ]}
          onChange={(value) => onCompletenessChange(value as CompletenessFilter)}
        />
        <FilterSelect
          icon={CalendarDays}
          label="Visited"
          value={dateFilter}
          options={[
            { label: "All dates", value: "all" },
            { label: "This month", value: "month" },
            { label: "Last 30 days", value: "recent" },
          ]}
          onChange={(value) => onDateChange(value as DateFilter)}
        />
      </div>
    </div>
  );
}

function FilterSelect({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: typeof Filter;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex h-10 min-w-0 items-center gap-1.5 rounded-lg border bg-background px-2 text-xs font-medium text-muted-foreground">
      <Icon className="shrink-0" />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="min-w-0 flex-1 bg-transparent text-foreground outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TierSection({
  tier,
  summaries,
  profiles,
  currentUserId,
  selectedCafeId,
  onRate,
  onSelect,
}: {
  tier: TierKey;
  summaries: CafeSummary[];
  profiles: Profile[];
  currentUserId: string | null;
  selectedCafeId: string;
  onRate: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  if (!summaries.length) {
    return null;
  }

  const styles = tierStyles[tier];

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold",
              styles.accent
            )}
          >
            {tier === "Awaiting" ? "..." : tier}
          </span>
          <div>
            <h2 className="text-base font-semibold">{tierLabels[tier]}</h2>
            <p className="text-xs text-muted-foreground">{styles.label}</p>
          </div>
        </div>
        <Badge variant="secondary">{summaries.length}</Badge>
      </div>

      <div className="grid gap-3">
        {summaries.map((summary) => (
          <CafeCard
            key={summary.cafe.id}
            summary={summary}
            profiles={profiles}
            currentUserId={currentUserId}
            isSelected={summary.cafe.id === selectedCafeId}
            onRate={onRate}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function CompactTierList({
  groupedSummaries,
  profiles,
  selectedCafeId,
  onSelect,
}: {
  groupedSummaries: Map<TierKey, CafeSummary[]>;
  profiles: Profile[];
  selectedCafeId: string;
  onSelect: (id: string) => void;
}) {
  const hasRows = tierOrder.some(
    (tier) => (groupedSummaries.get(tier) ?? []).length > 0
  );

  if (!hasRows) {
    return (
      <Empty className="min-h-72 rounded-lg border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Search />
          </EmptyMedia>
          <EmptyTitle>No lattes judged yet.</EmptyTitle>
          <EmptyDescription>
            Clear the filters or search another Bahrain cafe.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {tierOrder.map((tier) => {
        const summaries = groupedSummaries.get(tier) ?? [];

        if (!summaries.length) {
          return null;
        }

        const styles = tierStyles[tier];

        return (
          <section key={tier} className="overflow-hidden rounded-lg border bg-card">
            <div className="flex items-center justify-between gap-3 border-b bg-secondary/50 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold",
                    styles.accent
                  )}
                >
                  {tier === "Awaiting" ? "..." : tier}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">
                    {tierLabels[tier]}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {styles.label}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">{summaries.length}</Badge>
            </div>

            <div className="hidden grid-cols-[minmax(180px,1fr)_repeat(4,72px)] gap-2 border-b px-3 py-2 text-xs font-semibold text-muted-foreground sm:grid">
              <span>Coffee</span>
              {profiles.map((profile) => (
                <span key={profile.id} className="text-center">
                  {profile.initials}
                </span>
              ))}
              <span className="text-center">Avg</span>
            </div>

            <div className="divide-y">
              {summaries.map((summary) => (
                <CompactTierRow
                  key={summary.cafe.id}
                  summary={summary}
                  profiles={profiles}
                  isSelected={summary.cafe.id === selectedCafeId}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CompactTierRow({
  summary,
  profiles,
  isSelected,
  onSelect,
}: {
  summary: CafeSummary;
  profiles: Profile[];
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(summary.cafe.id)}
      className={cn(
        "grid w-full gap-2 px-3 py-3 text-left transition hover:bg-secondary/45 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:grid-cols-[minmax(180px,1fr)_repeat(4,72px)] sm:items-center",
        isSelected && "bg-secondary"
      )}
    >
      <span className="min-w-0 truncate text-sm font-semibold">
        {summary.cafe.name}
      </span>

      <span className="grid grid-cols-4 gap-2 sm:contents">
        {profiles.map((profile) => {
          const rating = summary.ratings.find(
            (item) => item.userId === profile.id
          );

          return (
            <span
              key={profile.id}
              className="rounded-lg bg-background px-2 py-1.5 text-center text-sm font-semibold ring-1 ring-border/70"
              title={profile.displayName}
            >
              <span className="block text-[0.65rem] font-medium text-muted-foreground sm:hidden">
                {profile.initials}
              </span>
              {rating ? rating.overall.toFixed(1) : "--"}
            </span>
          );
        })}
        <span className="rounded-lg bg-primary px-2 py-1.5 text-center text-sm font-semibold text-primary-foreground">
          <span className="block text-[0.65rem] font-medium opacity-80 sm:hidden">
            Avg
          </span>
          {summary.average?.toFixed(1) ?? "--"}
        </span>
      </span>
    </button>
  );
}

function CafeCard({
  summary,
  profiles,
  currentUserId,
  isSelected,
  onRate,
  onSelect,
}: {
  summary: CafeSummary;
  profiles: Profile[];
  currentUserId: string | null;
  isSelected: boolean;
  onRate: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const styles = tierStyles[summary.tier];
  const location = formatCafeLocation(summary.cafe);

  return (
    <Card
      size="sm"
      className={cn(
        "rounded-lg bg-card transition hover:-translate-y-0.5 hover:shadow-md",
        isSelected && styles.ring,
        isSelected && "ring-2"
      )}
    >
      <div
        role="button"
        tabIndex={0}
        className="grid min-h-[164px] cursor-pointer grid-cols-[92px_1fr] text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:grid-cols-[118px_1fr]"
        onClick={() => onSelect(summary.cafe.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(summary.cafe.id);
          }
        }}
      >
        <div
          className={cn(
            "club-photo h-full min-h-[164px] bg-cover bg-center",
            !summary.cafe.photoUrl && "grid place-items-center"
          )}
          style={
            summary.cafe.photoUrl
              ? {
                  backgroundImage: `linear-gradient(180deg, rgb(45 27 18 / 0.1), rgb(45 27 18 / 0.26)), url(${summary.cafe.photoUrl})`,
                }
              : undefined
          }
        >
          {!summary.cafe.photoUrl && <Coffee className="text-primary/55" />}
        </div>

        <div className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{summary.cafe.name}</h3>
              {location && (
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin />
                  {location}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!currentUserId}
                className="h-10 rounded-lg bg-primary/95 px-3 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary hover:shadow-md"
                onClick={(event) => {
                  event.stopPropagation();
                  onRate(summary.cafe.id);
                }}
              >
                <Pencil className="size-3.5" />
                Rate
              </Button>
              <div className="rounded-lg bg-secondary px-2 py-1 text-center ring-1 ring-border/50">
                <p className="text-xs text-muted-foreground">Avg</p>
                <p className="font-semibold">
                  {summary.average?.toFixed(1) ?? "--"}
                </p>
              </div>
            </div>
          </div>

          <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
            {summary.topComment || summary.cafe.notes || "Waiting for notes."}
          </p>

          <div className="grid grid-cols-3 gap-1.5">
            {profiles.map((profile) => {
              const rating = summary.ratings.find(
                (item) => item.userId === profile.id
              );

              return (
                <FriendScorePill
                  key={profile.id}
                  profile={profile}
                  score={rating?.overall}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Badge variant={summary.isComplete ? "secondary" : "outline"}>
              {summary.ratings.length}/{REQUIRED_FRIEND_COUNT} rated
            </Badge>
            {!summary.isComplete && (
              <span className="text-xs font-medium text-muted-foreground">
                Waiting for the full council.
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function FriendScorePill({
  profile,
  score,
}: {
  profile: Profile;
  score: number | undefined;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-secondary px-2 py-1.5 ring-1 ring-border/60">
      <div className="flex items-center gap-1.5">
        <span
          className="flex size-5 shrink-0 items-center justify-center rounded-md text-[0.65rem] font-semibold text-white"
          style={{ backgroundColor: profile.avatarColor }}
        >
          {profile.initials}
        </span>
        <span className="truncate text-[0.7rem] font-medium text-muted-foreground">
          {profile.displayName}
        </span>
      </div>
      <p className="mt-1 text-lg font-semibold leading-none">
        {score === undefined ? "--" : score.toFixed(1)}
      </p>
    </div>
  );
}

function CafeDetail({
  branchSummaries,
  profiles,
  summary,
  onSelectBranch,
}: {
  branchSummaries: CafeSummary[];
  profiles: Profile[];
  summary: CafeSummary | null;
  onSelectBranch: (cafeId: string) => void;
}) {
  if (!summary) {
    return (
      <section className="rounded-lg border bg-card p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Coffee />
            </EmptyMedia>
            <EmptyTitle>No cafe selected.</EmptyTitle>
            <EmptyDescription>
              Search the Bahrain list, pick a cafe, and rate the cup.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    );
  }

  const { cafe } = summary;
  const styles = tierStyles[summary.tier];
  const location = formatCafeLocation(cafe);

  return (
    <section className="sticky top-4 flex min-w-0 flex-col gap-4 rounded-lg border bg-card/85 p-3 shadow-sm backdrop-blur sm:p-4">
      <div
        className="club-photo relative min-h-64 overflow-hidden rounded-lg bg-cover bg-center"
        style={
          cafe.photoUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgb(45 27 18 / 0.04), rgb(45 27 18 / 0.48)), url(${cafe.photoUrl})`,
              }
            : undefined
        }
      >
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold">{cafe.name}</h2>
              {location && (
                <p className="mt-1 flex items-center gap-1 text-sm text-white/78">
                  <MapPin />
                  {location}
                </p>
              )}
            </div>
            <div className="rounded-lg bg-white/90 px-3 py-2 text-center text-primary">
              <p className="text-xs">Average</p>
              <p className="text-2xl font-semibold">
                {summary.average?.toFixed(1) ?? "--"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-semibold",
            styles.accent
          )}
        >
          {tierLabels[summary.tier]}
        </span>
        <Badge variant="outline">
          {summary.ratings.length}/{REQUIRED_FRIEND_COUNT} friends
        </Badge>
        <Badge variant="outline">{formatDate(cafe.visitDate)}</Badge>
      </div>

      {cafe.notes && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {cafe.notes}
        </p>
      )}

      {branchSummaries.length > 1 && (
        <div className="rounded-lg border bg-background p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">
              {getCafeBrand(cafe.name)} branches
            </p>
            <Badge variant="secondary">{branchSummaries.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {branchSummaries.map((branch) => (
              <button
                key={branch.cafe.id}
                type="button"
                onClick={() => onSelectBranch(branch.cafe.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-xs transition hover:border-primary/45 hover:bg-secondary",
                  branch.cafe.id === cafe.id
                    ? "border-primary bg-secondary text-primary"
                    : "bg-card text-muted-foreground"
                )}
              >
                <span className="block font-medium text-foreground">
                  {formatCafeLocation(branch.cafe)}
                </span>
                <span>
                  {branch.ratings.length}/{REQUIRED_FRIEND_COUNT} rated
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {profiles.map((profile) => {
          const rating = summary.ratings.find(
            (item) => item.userId === profile.id
          );

          return (
            <RatingCard
              key={profile.id}
              profile={profile}
              rating={rating}
            />
          );
        })}
      </div>
    </section>
  );
}

function RatingCard({
  profile,
  rating,
}: {
  profile: Profile;
  rating: Rating | undefined;
}) {
  return (
    <Card size="sm" className="rounded-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FriendAvatar profile={profile} />
          <div>
            <CardTitle>{profile.displayName}</CardTitle>
            <CardDescription>
              {rating ? formatDate(rating.visitDate) : "Still thinking"}
            </CardDescription>
          </div>
        </div>
        {rating && (
          <CardAction>
            <div className="rounded-lg bg-secondary px-2 py-1 text-center">
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="font-semibold">{rating.overall.toFixed(1)}</p>
            </div>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {rating ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <ScorePill label="Sweetness" value={rating.sweetness} />
              <ScorePill label="Coffee" value={rating.coffeeStrength} />
              <ScorePill label="Value" value={rating.priceValue} />
              <ScorePill label="Creaminess" value={rating.creaminess} />
            </div>
            <p className="text-sm text-muted-foreground">{rating.comment}</p>
            <div className="flex items-center gap-2">
              <Badge variant={rating.wouldOrderAgain ? "secondary" : "outline"}>
                <Heart />
                {rating.wouldOrderAgain ? "Would order again" : "One and done"}
              </Badge>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Awaiting verdict from {profile.displayName}.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted px-2 py-1.5">
      <p className="truncate text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{value}/5</p>
    </div>
  );
}

function FriendComparison({
  profiles,
  ratings,
  stats,
}: {
  profiles: Profile[];
  ratings: Rating[];
  stats: {
    averages: {
      profile: Profile;
      average: number | null;
      favorite: Cafe | null;
    }[];
    mostGenerous: { profile: Profile; average: number } | null;
    strictest: { profile: Profile; average: number } | null;
    alignedPair: { label: string; delta: number } | null;
  };
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Crown}
          title="Most generous rater"
          value={
            stats.mostGenerous
              ? stats.mostGenerous.profile.displayName
              : "Not enough data"
          }
          detail={
            stats.mostGenerous
              ? `${stats.mostGenerous.average.toFixed(1)} average`
              : "Rate a few more cups"
          }
        />
        <StatCard
          icon={Scale}
          title="Strictest rater"
          value={stats.strictest ? stats.strictest.profile.displayName : "Open"}
          detail={
            stats.strictest
              ? `${stats.strictest.average.toFixed(1)} average`
              : "No verdicts yet"
          }
        />
        <StatCard
          icon={Users}
          title="Most aligned pair"
          value={stats.alignedPair?.label ?? "Too early"}
          detail={
            stats.alignedPair
              ? `${stats.alignedPair.delta.toFixed(1)} average gap`
              : "Needs shared ratings"
          }
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {profiles.map((profile) => {
          const average = stats.averages.find(
            (item) => item.profile.id === profile.id
          );
          const count = ratings.filter(
            (rating) => rating.userId === profile.id
          ).length;

          return (
            <Card key={profile.id} className="rounded-lg">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FriendAvatar profile={profile} />
                  <div>
                    <CardTitle>{profile.displayName}</CardTitle>
                    <CardDescription>{count} verdicts logged</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="rounded-lg bg-secondary p-3">
                  <p className="text-xs text-muted-foreground">Average score</p>
                  <p className="text-3xl font-semibold">
                    {average?.average?.toFixed(1) ?? "--"}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Favorite cafe:{" "}
                  <span className="font-medium text-foreground">
                    {average?.favorite?.name ?? "Still searching"}
                  </span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: typeof Trophy;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function AddCafeDialog({
  draft,
  isOpen,
  isSubmitting,
  ratingDraft,
  onDraftChange,
  onOpenChange,
  onRatingDraftChange,
  onSubmit,
}: {
  draft: CafeDraft;
  isOpen: boolean;
  isSubmitting: boolean;
  ratingDraft: RatingDraft;
  onDraftChange: (draft: CafeDraft) => void;
  onOpenChange: (open: boolean) => void;
  onRatingDraftChange: (draft: RatingDraft) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-lg sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a cafe</DialogTitle>
          <DialogDescription>
            Add the place, then log your first verdict while the cup is fresh.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="cafe-name">Cafe name</FieldLabel>
              <Input
                id="cafe-name"
                value={draft.name}
                onChange={(event) =>
                  onDraftChange({ ...draft, name: event.currentTarget.value })
                }
                placeholder="Crema & Co."
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="area">Area</FieldLabel>
              <Input
                id="area"
                value={draft.area}
                onChange={(event) =>
                  onDraftChange({ ...draft, area: event.currentTarget.value })
                }
                placeholder="Al Olaya"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="city">City</FieldLabel>
              <Input
                id="city"
                value={draft.city}
                onChange={(event) =>
                  onDraftChange({ ...draft, city: event.currentTarget.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="visit-date">Visited date</FieldLabel>
              <Input
                id="visit-date"
                type="date"
                value={draft.visitDate}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    visitDate: event.currentTarget.value,
                  })
                }
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <Textarea
              id="notes"
              value={draft.notes}
              onChange={(event) =>
                onDraftChange({ ...draft, notes: event.currentTarget.value })
              }
              placeholder="Tiny table, great foam, suspiciously good ice."
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="cafe-photo">Optional photo</FieldLabel>
            <Input
              id="cafe-photo"
              type="file"
              accept="image/*"
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  photoFile: event.currentTarget.files?.[0] ?? null,
                })
              }
            />
            <FieldDescription>
              Stored in Supabase Storage when your project keys are connected.
            </FieldDescription>
          </Field>

          <Field orientation="horizontal">
            <Switch
              checked={draft.rateNow}
              onCheckedChange={(checked) =>
                onDraftChange({ ...draft, rateNow: checked })
              }
            />
            <div>
              <FieldLabel>Rate this cafe now</FieldLabel>
              <FieldDescription>
                Prevents duplicate ratings by saving one verdict for your user.
              </FieldDescription>
            </div>
          </Field>

          {draft.rateNow && (
            <div className="rounded-lg border bg-muted/45 p-3">
              <RatingFields
                draft={ratingDraft}
                onDraftChange={onRatingDraftChange}
              />
            </div>
          )}
        </FieldGroup>

        <DialogFooter>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !draft.name.trim() || !draft.area.trim()}
          >
            {isSubmitting ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Plus data-icon="inline-start" />
            )}
            Add cafe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RatingDialog({
  cafeName,
  draft,
  hasExistingRating,
  isOpen,
  isSubmitting,
  onDelete,
  onDraftChange,
  onOpenChange,
  onSubmit,
  updateField,
}: {
  cafeName: string;
  draft: RatingDraft;
  hasExistingRating: boolean;
  isOpen: boolean;
  isSubmitting: boolean;
  onDelete: () => void;
  onDraftChange: (draft: RatingDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  updateField: <K extends keyof RatingDraft>(
    key: K,
    value: RatingDraft[K]
  ) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-lg sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Your verdict for {cafeName}</DialogTitle>
          <DialogDescription>
            Only you can create, edit, or remove this rating.
          </DialogDescription>
        </DialogHeader>

        <RatingFields
          draft={draft}
          onDraftChange={onDraftChange}
          updateField={updateField}
        />

        <DialogFooter className="gap-2 sm:justify-between">
          {hasExistingRating && (
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isSubmitting}
            >
              <Trash2 data-icon="inline-start" />
              Remove rating
            </Button>
          )}
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Check data-icon="inline-start" />
            )}
            Save verdict
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RatingFields({
  draft,
  onDraftChange,
  updateField,
}: {
  draft: RatingDraft;
  onDraftChange: (draft: RatingDraft) => void;
  updateField?: <K extends keyof RatingDraft>(
    key: K,
    value: RatingDraft[K]
  ) => void;
}) {
  const setField =
    updateField ??
    (<K extends keyof RatingDraft>(key: K, value: RatingDraft[K]) => {
      onDraftChange({ ...draft, [key]: value });
    });

  return (
    <FieldGroup>
      <ScoreSlider
        label="Overall Spanish latte"
        max={10}
        step={0.5}
        value={draft.overall}
        onChange={(value) => setField("overall", value)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreSlider
          label="Sweetness"
          max={5}
          value={draft.sweetness}
          onChange={(value) => setField("sweetness", value)}
        />
        <ScoreSlider
          label="Coffee"
          max={5}
          value={draft.coffeeStrength}
          onChange={(value) => setField("coffeeStrength", value)}
        />
        <ScoreSlider
          label="Value"
          max={5}
          value={draft.priceValue}
          onChange={(value) => setField("priceValue", value)}
        />
        <ScoreSlider
          label="Creaminess"
          max={5}
          value={draft.creaminess}
          onChange={(value) => setField("creaminess", value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="rating-date">Visit date</FieldLabel>
          <Input
            id="rating-date"
            type="date"
            value={draft.visitDate}
            onChange={(event) =>
              setField("visitDate", event.currentTarget.value)
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="rating-photo">Optional photo</FieldLabel>
          <Input
            id="rating-photo"
            type="file"
            accept="image/*"
            onChange={(event) =>
              setField("photoFile", event.currentTarget.files?.[0] ?? null)
            }
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="comment">Comment</FieldLabel>
        <Textarea
          id="comment"
          value={draft.comment}
          onChange={(event) => setField("comment", event.currentTarget.value)}
          placeholder="Be honest. The latte deserves it."
        />
      </Field>

      <Field orientation="horizontal">
        <Switch
          checked={draft.wouldOrderAgain}
          onCheckedChange={(checked) => setField("wouldOrderAgain", checked)}
        />
        <div>
          <FieldLabel>Would order again</FieldLabel>
          <FieldDescription>
            The final gut-check after all the scoring.
          </FieldDescription>
        </div>
      </Field>
    </FieldGroup>
  );
}

function ScoreSlider({
  label,
  max,
  onChange,
  step = 1,
  value,
}: {
  label: string;
  max: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}) {
  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>{label}</FieldLabel>
        <span className="rounded-lg bg-secondary px-2 py-1 text-sm font-semibold">
          {value}/{max}
        </span>
      </div>
      <Slider
        min={1}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(nextValue) => {
          const next = Array.isArray(nextValue) ? nextValue[0] : nextValue;
          onChange(Number(next ?? value));
        }}
      />
    </Field>
  );
}

function FriendAvatar({ profile }: { profile: Profile }) {
  return (
    <Avatar className="size-8 rounded-lg">
      <AvatarFallback
        className="rounded-lg text-xs font-semibold text-white"
        style={{ backgroundColor: profile.avatarColor }}
      >
        {profile.initials}
      </AvatarFallback>
    </Avatar>
  );
}
