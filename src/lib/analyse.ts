import { cars, type Car } from "@/lib/catalog";
import { yearNow } from "@/lib/format";

export type PriceBand = "below" | "fair" | "above";

export interface CarAnalysis {
  priceDelta: number;
  priceDeltaPct: number;
  band: PriceBand;
  kmPerYear: number;
  kmBand: "low" | "typical" | "high";
  similar: Car[];
  similarAvg: number;
  gariiScore: number;
  scoreNotes: string[];
  annualFuelKes: number;
  insuranceKes: number;
  residual12m: number;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function priceBand(deltaPct: number): PriceBand {
  if (deltaPct <= -0.04) return "below";
  if (deltaPct >= 0.05) return "above";
  return "fair";
}

export function analyseCar(car: Car, pool: Car[] = cars): CarAnalysis {
  const similar = pool
    .filter(
      (c) =>
        c.id !== car.id &&
        (c.make === car.make || c.body === car.body) &&
        Math.abs(c.year - car.year) <= 4,
    )
    .sort(
      (a, b) =>
        Math.abs(a.price - car.price) - Math.abs(b.price - car.price),
    )
    .slice(0, 4);

  const similarAvg = similar.length
    ? mean(similar.map((c) => c.price))
    : car.marketValue;
  const priceDelta = car.price - car.marketValue;
  const priceDeltaPct = priceDelta / car.marketValue;
  const age = Math.max(1, yearNow() - car.year);
  const kmPerYear = car.mileage / age;
  const kmBand: CarAnalysis["kmBand"] =
    kmPerYear < 12_000 ? "low" : kmPerYear > 22_000 ? "high" : "typical";

  const notes: string[] = [];
  let score = 62;
  if (priceDeltaPct < -0.04) {
    score += 12;
    notes.push("Asking sits under 88Motor Stores market value.");
  } else if (priceDeltaPct > 0.06) {
    score -= 10;
    notes.push("Asking is above the current market band.");
  } else {
    score += 6;
    notes.push("Priced inside the fair band for this spec.");
  }
  if (kmBand === "low") {
    score += 8;
    notes.push("Kilometres per year are kinder than the Kenya average.");
  } else if (kmBand === "high") {
    score -= 6;
    notes.push("Higher annual kilometres — budget consumables sooner.");
  }
  if (car.dutyPaid) {
    score += 4;
    notes.push("Duty paid. Paperwork is the short conversation.");
  }
  if (car.owners === 1) {
    score += 5;
    notes.push("One owner on the logbook.");
  } else if (car.owners > 2) {
    score -= 3;
  }
  if (car.auctionGrade === "4.5") {
    score += 6;
    notes.push("Auction grade 4.5 — body and interior were clean at the port.");
  }
  if (car.condition === "Excellent") score += 4;
  if (car.demand >= 85) {
    score += 5;
    notes.push("High demand on 88Motor Stores — expect this one to move.");
  }
  score = Math.max(38, Math.min(96, score));

  const fuelRate =
    car.fuel === "Diesel" ? 18.5 : car.fuel === "Hybrid" ? 9.5 : 14.5;
  const litresYear = (18_000 / 100) * fuelRate;
  const pump = car.fuel === "Diesel" ? 171 : 189;
  const annualFuelKes = litresYear * pump;
  const insuranceKes = Math.round(car.price * 0.035);
  const residual12m = Math.round(car.price * (car.body === "SUV" ? 0.91 : 0.88));

  return {
    priceDelta,
    priceDeltaPct,
    band: priceBand(priceDeltaPct),
    kmPerYear,
    kmBand,
    similar,
    similarAvg,
    gariiScore: score,
    scoreNotes: notes,
    annualFuelKes,
    insuranceKes,
    residual12m,
  };
}

export function makeShare(): Record<string, number> {
  const total = cars.length;
  const counts: Record<string, number> = {};
  for (const c of cars) {
    counts[c.make] = (counts[c.make] ?? 0) + 1;
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) {
    out[k] = v / total;
  }
  return out;
}

export function citySupply(): { city: string; cars: number; avg: number }[] {
  const map = new Map<string, number[]>();
  for (const c of cars) {
    const arr = map.get(c.city) ?? [];
    arr.push(c.price);
    map.set(c.city, arr);
  }
  return [...map.entries()]
    .map(([city, prices]) => ({
      city,
      cars: prices.length,
      avg: mean(prices),
    }))
    .sort((a, b) => b.cars - a.cars);
}